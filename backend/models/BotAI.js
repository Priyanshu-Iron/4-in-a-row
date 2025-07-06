const GameLogic = require('./GameLogic');

class BotAI {
  constructor(botPlayer = 2) {
    this.botPlayer = botPlayer;
    this.humanPlayer = botPlayer === 1 ? 2 : 1;
    this.maxDepth = 6; // Minimax search depth
  }

  // Main method to get the bot's move
  getBestMove(gameLogic) {
    const validMoves = gameLogic.getValidMoves();
    
    if (validMoves.length === 0) {
      return null;
    }

    // Priority 1: Check if bot can win immediately
    const winningMove = this.findWinningMove(gameLogic, this.botPlayer);
    if (winningMove !== null) {
      return winningMove;
    }

    // Priority 2: Block human player from winning
    const blockingMove = this.findWinningMove(gameLogic, this.humanPlayer);
    if (blockingMove !== null) {
      return blockingMove;
    }

    // Priority 3: Use minimax for strategic play
    const bestMove = this.minimax(gameLogic, this.maxDepth, true, -Infinity, Infinity);
    return bestMove.column;
  }

  // Find a move that wins the game for the specified player
  findWinningMove(gameLogic, player) {
    const validMoves = gameLogic.getValidMoves();
    
    for (const column of validMoves) {
      const gameClone = gameLogic.clone();
      const result = gameClone.makeMove(column, player);
      
      if (result.success && result.gameStatus === 'won' && result.winner === player) {
        return column;
      }
    }
    
    return null;
  }

  // Minimax algorithm with alpha-beta pruning
  minimax(gameLogic, depth, isMaximizing, alpha, beta) {
    const gameStatus = gameLogic.gameStatus;
    
    // Terminal conditions
    if (depth === 0 || gameStatus !== 'active') {
      return { score: this.evaluateBoard(gameLogic), column: null };
    }

    const validMoves = gameLogic.getValidMoves();
    let bestColumn = validMoves[0];

    if (isMaximizing) {
      let maxScore = -Infinity;
      
      for (const column of validMoves) {
        const gameClone = gameLogic.clone();
        gameClone.makeMove(column, this.botPlayer);
        
        const result = this.minimax(gameClone, depth - 1, false, alpha, beta);
        
        if (result.score > maxScore) {
          maxScore = result.score;
          bestColumn = column;
        }
        
        alpha = Math.max(alpha, result.score);
        if (beta <= alpha) {
          break; // Alpha-beta pruning
        }
      }
      
      return { score: maxScore, column: bestColumn };
    } else {
      let minScore = Infinity;
      
      for (const column of validMoves) {
        const gameClone = gameLogic.clone();
        gameClone.makeMove(column, this.humanPlayer);
        
        const result = this.minimax(gameClone, depth - 1, true, alpha, beta);
        
        if (result.score < minScore) {
          minScore = result.score;
          bestColumn = column;
        }
        
        beta = Math.min(beta, result.score);
        if (beta <= alpha) {
          break; // Alpha-beta pruning
        }
      }
      
      return { score: minScore, column: bestColumn };
    }
  }

  // Evaluate the board position
  evaluateBoard(gameLogic) {
    const board = gameLogic.board;
    const width = gameLogic.width;
    const height = gameLogic.height;

    // Check for terminal states
    if (gameLogic.gameStatus === 'won') {
      if (gameLogic.winner === this.botPlayer) {
        return 10000; // Bot wins
      } else {
        return -10000; // Human wins
      }
    }
    
    if (gameLogic.gameStatus === 'draw') {
      return 0; // Draw
    }

    let score = 0;

    // Evaluate all possible 4-in-a-row windows
    // Horizontal
    for (let row = 0; row < height; row++) {
      for (let col = 0; col < width - 3; col++) {
        const window = [board[row][col], board[row][col + 1], board[row][col + 2], board[row][col + 3]];
        score += this.evaluateWindow(window);
      }
    }

    // Vertical
    for (let col = 0; col < width; col++) {
      for (let row = 0; row < height - 3; row++) {
        const window = [board[row][col], board[row + 1][col], board[row + 2][col], board[row + 3][col]];
        score += this.evaluateWindow(window);
      }
    }

    // Diagonal (positive slope)
    for (let row = 0; row < height - 3; row++) {
      for (let col = 0; col < width - 3; col++) {
        const window = [board[row][col], board[row + 1][col + 1], board[row + 2][col + 2], board[row + 3][col + 3]];
        score += this.evaluateWindow(window);
      }
    }

    // Diagonal (negative slope)
    for (let row = 3; row < height; row++) {
      for (let col = 0; col < width - 3; col++) {
        const window = [board[row][col], board[row - 1][col + 1], board[row - 2][col + 2], board[row - 3][col + 3]];
        score += this.evaluateWindow(window);
      }
    }

    // Prefer center columns
    const centerCol = Math.floor(width / 2);
    for (let row = 0; row < height; row++) {
      if (board[row][centerCol] === this.botPlayer) {
        score += 3;
      }
    }

    return score;
  }

  // Evaluate a 4-cell window
  evaluateWindow(window) {
    let score = 0;
    const botCount = window.filter(cell => cell === this.botPlayer).length;
    const humanCount = window.filter(cell => cell === this.humanPlayer).length;
    const emptyCount = window.filter(cell => cell === 0).length;

    // Only evaluate if window doesn't contain both players' pieces
    if (botCount > 0 && humanCount > 0) {
      return 0;
    }

    // Bot scoring
    if (botCount === 4) {
      score += 100;
    } else if (botCount === 3 && emptyCount === 1) {
      score += 10;
    } else if (botCount === 2 && emptyCount === 2) {
      score += 2;
    }

    // Human blocking (negative scoring)
    if (humanCount === 4) {
      score -= 100;
    } else if (humanCount === 3 && emptyCount === 1) {
      score -= 80; // High priority to block
    } else if (humanCount === 2 && emptyCount === 2) {
      score -= 5;
    }

    return score;
  }

  // Get a move with some strategic randomness for easier difficulty levels
  getRandomStrategicMove(gameLogic) {
    const validMoves = gameLogic.getValidMoves();
    
    if (validMoves.length === 0) {
      return null;
    }

    // Still prioritize winning and blocking
    const winningMove = this.findWinningMove(gameLogic, this.botPlayer);
    if (winningMove !== null) {
      return winningMove;
    }

    const blockingMove = this.findWinningMove(gameLogic, this.humanPlayer);
    if (blockingMove !== null) {
      return blockingMove;
    }

    // Choose randomly from center columns first, then others
    const centerCols = [3, 2, 4, 1, 5, 0, 6].filter(col => validMoves.includes(col));
    return centerCols[Math.floor(Math.random() * centerCols.length)];
  }
}

module.exports = BotAI; 