const { v4: uuidv4 } = require('uuid');
const GameLogic = require('../models/GameLogic');
const BotAI = require('../models/BotAI');
const config = require('../config');

class GameManager {
  constructor(io, database, kafkaService) {
    this.io = io;
    this.database = database;
    this.kafka = kafkaService;
    
    // Active games in memory
    this.activeGames = new Map(); // gameId -> gameState
    this.waitingPlayers = new Map(); // socketId -> playerInfo
    this.playerSockets = new Map(); // username -> socketId
    this.socketPlayers = new Map(); // socketId -> username
    this.reconnectionTimers = new Map(); // username -> timeout
    
    // Bot instance
    this.bot = new BotAI(2);
    
    // Matchmaking timer
    this.matchmakingInterval = null;
    this.startMatchmaking();
  }

  // Handle new socket connection
  handleConnection(socket) {
    console.log(`🔌 New connection: ${socket.id}`);
    
    socket.on('join_game', (data) => this.handleJoinGame(socket, data));
    socket.on('make_move', (data) => this.handleMakeMove(socket, data));
    socket.on('reconnect_game', (data) => this.handleReconnect(socket, data));
    socket.on('get_leaderboard', () => this.handleGetLeaderboard(socket));
    socket.on('get_user_stats', (data) => this.handleGetUserStats(socket, data));
    socket.on('disconnect', () => this.handleDisconnect(socket));
  }

  // Handle player joining game
  async handleJoinGame(socket, { username, vsBot }) {
    if (!username || username.trim() === '') {
      socket.emit('error', { message: 'Username is required' });
      return;
    }

    // Normalize username on join
    username = username.trim().toLowerCase();
    
    // Check if player is already in a game
    if (this.playerSockets.has(username)) {
      socket.emit('error', { message: 'Username already in use' });
      return;
    }

    // Clear any existing reconnection timer
    if (this.reconnectionTimers.has(username)) {
      clearTimeout(this.reconnectionTimers.get(username));
      this.reconnectionTimers.delete(username);
    }

    // Create or update user in database
    await this.database.createOrUpdateUser(username);
    
    // Store player mapping
    this.playerSockets.set(username, socket.id);
    this.socketPlayers.set(socket.id, username);
    
    // If vsBot is true, immediately create a game with the bot
    if (vsBot) {
      await this.createGame({ username, socketId: socket.id }, { username: 'bot', socketId: null });
      return;
    }

    // Add to waiting players
    this.waitingPlayers.set(socket.id, {
      username,
      socketId: socket.id,
      joinedAt: Date.now()
    });

    socket.emit('waiting_for_opponent', { username });
    
    // Publish player joined event
    await this.kafka.playerJoined({ username, socketId: socket.id });
    
    console.log(`👤 Player joined: ${username}`);
  }

  // Handle player making a move
  async handleMakeMove(socket, { gameId, column }) {
    const username = this.socketPlayers.get(socket.id)?.trim().toLowerCase();
    if (!username) {
      socket.emit('error', { message: 'Player not found' });
      return;
    }

    const game = this.activeGames.get(gameId);
    if (!game) {
      socket.emit('error', { message: 'Game not found' });
      return;
    }

    // Check if it's the player's turn
    const playerNumber = game.player1 === username ? 1 : 2;
    if (game.gameLogic.currentPlayer !== playerNumber) {
      socket.emit('error', { message: 'Not your turn' });
      return;
    }

    // Make the move
    const moveStartTime = Date.now();
    const result = game.gameLogic.makeMove(column, playerNumber);
    
    if (!result.success) {
      socket.emit('error', { message: result.message });
      return;
    }

    // Update move count and save move to database
    game.moveCount++;
    const moveData = {
      moveNumber: game.moveCount,
      player: username,
      columnIndex: column,
      rowIndex: result.row
    };
    
    await this.database.saveMove(gameId, moveData);

    // Publish move event to Kafka
    await this.kafka.moveMade({
      gameId,
      player: username,
      column,
      row: result.row,
      thinkTime: Date.now() - moveStartTime
    });

    // Emit game update to all players in the game
    this.io.to(gameId).emit('game_update', {
      gameId,
      board: game.gameLogic.board,
      currentPlayer: game.gameLogic.currentPlayer,
      gameStatus: game.gameLogic.gameStatus,
      winner: game.gameLogic.winner === 1 ? game.player1 : game.gameLogic.winner === 2 ? game.player2 : null,
      winningCells: game.gameLogic.winningCells,
      lastMove: { player: username, column, row: result.row },
      moveCount: game.moveCount
    });

    console.log(`🎮 Move made: ${username} -> Column ${column} in game ${gameId}`);

    // Check if game ended
    if (game.gameLogic.gameStatus !== 'active') {
      await this.endGame(gameId);
      return;
    }

    // If playing against bot, make bot move
    if (game.player2 === 'bot' && game.gameLogic.currentPlayer === 2) {
      setTimeout(() => this.makeBotMove(gameId), config.game.botMoveDelay);
    }
  }

  // Handle player reconnection
  async handleReconnect(socket, { username, gameId }) {
    if (!username) {
      socket.emit('error', { message: 'Username is required' });
      return;
    }

    // Clear reconnection timer
    if (this.reconnectionTimers.has(username)) {
      clearTimeout(this.reconnectionTimers.get(username));
      this.reconnectionTimers.delete(username);
    }

    // Update socket mappings
    this.playerSockets.set(username, socket.id);
    this.socketPlayers.set(socket.id, username);

    // Find the game
    let game = null;
    if (gameId) {
      game = this.activeGames.get(gameId);
    } else {
      // Search for game by username
      for (const [id, gameState] of this.activeGames) {
        if (gameState.player1 === username || gameState.player2 === username) {
          game = gameState;
          gameId = id;
          break;
        }
      }
    }

    if (game) {
      socket.join(gameId);
      socket.emit('game_reconnected', {
        gameId,
        board: game.gameLogic.board,
        currentPlayer: game.gameLogic.currentPlayer,
        gameStatus: game.gameLogic.gameStatus,
        player1: game.player1,
        player2: game.player2,
        moveCount: game.moveCount
      });
      
      console.log(`🔄 Player reconnected: ${username} to game ${gameId}`);
    } else {
      socket.emit('error', { message: 'No active game found' });
    }
  }

  // Handle getting leaderboard
  async handleGetLeaderboard(socket) {
    try {
      const leaderboard = await this.database.getLeaderboard(10);
      socket.emit('leaderboard', { leaderboard });
    } catch (error) {
      socket.emit('error', { message: 'Failed to get leaderboard' });
    }
  }

  // Handle getting user stats
  async handleGetUserStats(socket, { username }) {
    try {
      const stats = await this.database.getUserStats(username);
      const gameHistory = await this.database.getUserGameHistory(username, 10);
      
      socket.emit('user_stats', { 
        stats: stats || { username, games_played: 0, games_won: 0, games_lost: 0, games_drawn: 0 },
        gameHistory 
      });
    } catch (error) {
      socket.emit('error', { message: 'Failed to get user stats' });
    }
  }

  // Handle player disconnect
  async handleDisconnect(socket) {
    const username = this.socketPlayers.get(socket.id)?.trim().toLowerCase();
    
    if (username) {
      console.log(`🔌 Player disconnected: ${username}`);
      
      // Remove from waiting players
      this.waitingPlayers.delete(socket.id);
      
      // Start reconnection timer
      this.startReconnectionTimer(username);
      
      // Publish disconnect event
      await this.kafka.playerDisconnected({ username, socketId: socket.id });
      
      // Remove socket mappings (but keep reconnection timer)
      this.socketPlayers.delete(socket.id);
      this.playerSockets.delete(username);
    }
  }

  // Start reconnection timer for disconnected player
  startReconnectionTimer(username) {
    const timer = setTimeout(async () => {
      console.log(`⏰ Reconnection timeout for ${username}`);
      
      // Find and forfeit any active game
      for (const [gameId, game] of this.activeGames) {
        if (game.player1 === username || game.player2 === username) {
          game.gameLogic.gameStatus = 'forfeited';
          game.gameLogic.winner = game.player1 === username ? game.player2 : game.player1;
          
          this.io.to(gameId).emit('game_update', {
            gameId,
            gameStatus: 'forfeited',
            winner: game.gameLogic.winner === 1 ? game.player1 : game.gameLogic.winner === 2 ? game.player2 : null,
            message: `${username} disconnected and did not reconnect`
          });
          
          await this.endGame(gameId);
          break;
        }
      }
      
      this.reconnectionTimers.delete(username);
    }, config.game.reconnectionTimeout);
    
    this.reconnectionTimers.set(username, timer);
  }

  // Start matchmaking system
  startMatchmaking() {
    this.matchmakingInterval = setInterval(() => {
      this.processMatchmaking();
    }, 1000); // Check every second
  }

  // Process matchmaking
  async processMatchmaking() {
    const waitingList = Array.from(this.waitingPlayers.values());
    
    if (waitingList.length === 0) return;

    // Group players by wait time
    const readyForBot = [];
    const readyForPlayer = [];
    
    const now = Date.now();
    
    for (const player of waitingList) {
      const waitTime = now - player.joinedAt;
      
      if (waitTime >= config.game.matchmakingTimeout) {
        readyForBot.push(player);
      } else {
        readyForPlayer.push(player);
      }
    }

    // Match players together first
    while (readyForPlayer.length >= 2) {
      const player1 = readyForPlayer.shift();
      const player2 = readyForPlayer.shift();
      
      await this.createGame(player1, player2);
    }

    // Match remaining players with bots
    for (const player of readyForBot) {
      await this.createGame(player, { username: 'bot', socketId: null });
    }
  }

  // Create a new game
  async createGame(player1, player2) {
    const gameId = uuidv4();
    const gameLogic = new GameLogic();
    
    const gameState = {
      gameId,
      player1: player1.username.trim().toLowerCase(),
      player2: player2.username.trim().toLowerCase(),
      gameLogic,
      startTime: Date.now(),
      moveCount: 0,
      isVsBot: player2.username === 'bot'
    };

    this.activeGames.set(gameId, gameState);
    
    // Remove players from waiting list
    this.waitingPlayers.delete(player1.socketId);
    if (player2.socketId) {
      this.waitingPlayers.delete(player2.socketId);
    }

    // Join players to game room
    const player1Socket = this.io.sockets.sockets.get(player1.socketId);
    if (player1Socket) {
      player1Socket.join(gameId);
    }
    
    if (player2.socketId) {
      const player2Socket = this.io.sockets.sockets.get(player2.socketId);
      if (player2Socket) {
        player2Socket.join(gameId);
      }
    }

    // Emit game start to players
    this.io.to(gameId).emit('game_started', {
      gameId,
      player1: player1.username,
      player2: player2.username,
      board: gameLogic.board,
      currentPlayer: gameLogic.currentPlayer,
      gameStatus: gameLogic.gameStatus,
      winner: gameLogic.winner,
      winningCells: gameLogic.winningCells,
      yourPlayer: null // Will be set individually below
    });

    // Send individual player info
    if (player1Socket) {
      player1Socket.emit('your_player_number', { playerNumber: 1 });
    }
    if (player2.socketId) {
      const player2Socket = this.io.sockets.sockets.get(player2.socketId);
      if (player2Socket) {
        player2Socket.emit('your_player_number', { playerNumber: 2 });
      }
    }

    // Publish game started event
    await this.kafka.gameStarted({
      gameId,
      player1: player1.username,
      player2: player2.username,
      gameType: gameState.isVsBot ? 'vs_bot' : 'vs_player'
    });

    console.log(`🎮 Game created: ${gameId} - ${player1.username} vs ${player2.username}`);
  }

  // Make bot move
  async makeBotMove(gameId) {
    const game = this.activeGames.get(gameId);
    if (!game || game.gameLogic.gameStatus !== 'active' || game.gameLogic.currentPlayer !== 2) {
      return;
    }

    const moveStartTime = Date.now();
    const column = this.bot.getBestMove(game.gameLogic);
    
    if (column === null) {
      console.error('Bot could not find a valid move');
      return;
    }

    const result = game.gameLogic.makeMove(column, 2);
    
    if (!result.success) {
      console.error('Bot made invalid move:', result.message);
      return;
    }

    game.moveCount++;
    const thinkTime = Date.now() - moveStartTime;

    // Save bot move to database
    await this.database.saveMove(gameId, {
      moveNumber: game.moveCount,
      player: 'bot',
      columnIndex: column,
      rowIndex: result.row
    });

    // Publish bot move event
    await this.kafka.botMove({
      gameId,
      column,
      row: result.row,
      thinkTime
    });

    // Emit game update
    this.io.to(gameId).emit('game_update', {
      gameId,
      board: game.gameLogic.board,
      currentPlayer: game.gameLogic.currentPlayer,
      gameStatus: game.gameLogic.gameStatus,
      winner: game.gameLogic.winner === 1 ? game.player1 : game.gameLogic.winner === 2 ? game.player2 : null,
      winningCells: game.gameLogic.winningCells,
      lastMove: { player: 'bot', column, row: result.row },
      moveCount: game.moveCount
    });

    console.log(`🤖 Bot move: Column ${column} in game ${gameId} (${thinkTime}ms)`);

    // Check if game ended
    if (game.gameLogic.gameStatus !== 'active') {
      await this.endGame(gameId);
    }
  }

  // End a game
  async endGame(gameId) {
    const game = this.activeGames.get(gameId);
    if (!game) return;

    const endTime = Date.now();
    const durationSeconds = Math.floor((endTime - game.startTime) / 1000);

    // Update user statistics
    if (game.player1 !== 'bot') {
      await this.database.updateUserStats(game.player1, {
        gameStatus: game.gameLogic.gameStatus,
        winner: game.gameLogic.winner
      });
    }
    
    if (game.player2 !== 'bot') {
      await this.database.updateUserStats(game.player2, {
        gameStatus: game.gameLogic.gameStatus,
        winner: game.gameLogic.winner
      });
    }

    // Save completed game to database
    await this.database.saveGame({
      gameId,
      player1Username: game.player1,
      player2Username: game.player2,
      winner: game.gameLogic.winner === 1 ? game.player1 : game.gameLogic.winner === 2 ? game.player2 : null,
      gameStatus: game.gameLogic.gameStatus,
      durationSeconds,
      totalMoves: game.moveCount,
      boardState: game.gameLogic.board
    });

    // Publish game ended event
    await this.kafka.gameEnded({
      gameId,
      player1: game.player1,
      player2: game.player2,
      winner: game.gameLogic.winner === 1 ? game.player1 : game.gameLogic.winner === 2 ? game.player2 : null,
      gameStatus: game.gameLogic.gameStatus,
      durationSeconds,
      totalMoves: game.moveCount
    });

    // Remove from active games
    this.activeGames.delete(gameId);

    // Clean up playerSockets and socketPlayers for both players if not in another active game
    const removePlayerMappings = (username) => {
      if (!username || username === 'bot') return;
      const socketId = this.playerSockets.get(username);
      if (!socketId) return;
      // Check if this user is in any other active game
      let stillInGame = false;
      for (const game of this.activeGames.values()) {
        if (game.player1 === username || game.player2 === username) {
          stillInGame = true;
          break;
        }
      }
      if (!stillInGame) {
        this.playerSockets.delete(username);
        this.socketPlayers.delete(socketId);
      }
    };
    removePlayerMappings(game.player1);
    removePlayerMappings(game.player2);

    console.log(`🏁 Game ended: ${gameId}, Winner: ${game.gameLogic.winner || 'Draw'}`);
  }

  // Get current game statistics
  getGameStats() {
    return {
      activeGames: this.activeGames.size,
      waitingPlayers: this.waitingPlayers.size,
      connectedPlayers: this.playerSockets.size,
      reconnectionTimers: this.reconnectionTimers.size
    };
  }

  // Cleanup method
  async cleanup() {
    if (this.matchmakingInterval) {
      clearInterval(this.matchmakingInterval);
    }
    
    // Clear all reconnection timers
    for (const timer of this.reconnectionTimers.values()) {
      clearTimeout(timer);
    }
    
    console.log('GameManager cleanup completed');
  }
}

module.exports = GameManager; 