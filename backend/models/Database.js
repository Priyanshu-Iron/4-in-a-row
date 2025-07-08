const mongoose = require('mongoose');
const config = require('../config');

// Define schemas
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  games_played: { type: Number, default: 0 },
  games_won: { type: Number, default: 0 },
  games_lost: { type: Number, default: 0 },
  games_drawn: { type: Number, default: 0 },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
});

const gameSchema = new mongoose.Schema({
  game_id: { type: String, required: true, unique: true },
  player1_username: String,
  player2_username: String,
  winner: String,
  game_status: { type: String, required: true },
  duration_seconds: Number,
  total_moves: Number,
  board_state: mongoose.Schema.Types.Mixed,
  created_at: { type: Date, default: Date.now },
  completed_at: Date
});

const gameMoveSchema = new mongoose.Schema({
  game_id: { type: String, required: true },
  move_number: { type: Number, required: true },
  player: { type: String, required: true },
  column_index: { type: Number, required: true },
  row_index: { type: Number, required: true },
  timestamp: { type: Date, default: Date.now }
});

// Create additional indexes (unique indexes are created automatically)
gameSchema.index({ created_at: 1 });
gameMoveSchema.index({ game_id: 1 });

// Create models
const User = mongoose.model('User', userSchema);
const Game = mongoose.model('Game', gameSchema);
const GameMove = mongoose.model('GameMove', gameMoveSchema);

class Database {
  constructor() {
    this.connected = false;
  }

  async connect() {
    try {
      await mongoose.connect(config.database.url, config.database.options);
      this.connected = true;
      console.log('✅ MongoDB connected successfully');
    } catch (error) {
      console.error('❌ MongoDB connection failed:', error.message);
      console.log('ℹ️  Make sure MongoDB is running and credentials are correct');
    }
  }

  // User management methods
  async createOrUpdateUser(username) {
    try {
      const normalized = username.trim().toLowerCase();
      const user = await User.findOneAndUpdate(
        { username: normalized },
        { username: normalized, updated_at: new Date() }, // Ensure username is always stored normalized
        { upsert: true, new: true }
      );
      return user;
    } catch (error) {
      console.error('Error creating/updating user:', error);
      return null;
    }
  }

  async getUserStats(username) {
    try {
      const normalized = username.trim().toLowerCase();
      const user = await User.findOne({ username: normalized });
      return user;
    } catch (error) {
      console.error('Error getting user stats:', error);
      return null;
    }
  }

  async updateUserStats(username, gameResult) {
    const { gameStatus, winner } = gameResult;
    try {
      const normalized = username.trim().toLowerCase();
      const normalizedWinner = winner ? winner.trim().toLowerCase() : null;
      const updateData = {
        $inc: { games_played: 1 },
        updated_at: new Date(),
        username: normalized // Always set username to normalized value
      };
      if (gameStatus === 'won') {
        if (normalizedWinner === normalized) {
          updateData.$inc.games_won = 1;
        } else {
          updateData.$inc.games_lost = 1;
        }
      } else if (gameStatus === 'draw') {
        updateData.$inc.games_drawn = 1;
      }
      console.log('[updateUserStats] Updating user:', normalized, updateData);
      const user = await User.findOneAndUpdate(
        { username: normalized },
        updateData,
        { new: true }
      );
      return user;
    } catch (error) {
      console.error('Error updating user stats:', error);
      return null;
    }
  }

  // Game management methods
  async saveGame(gameData) {
    const {
      gameId,
      player1Username,
      player2Username,
      winner,
      gameStatus,
      durationSeconds,
      totalMoves,
      boardState
    } = gameData;

    try {
      const game = new Game({
        game_id: gameId,
        player1_username: player1Username,
        player2_username: player2Username,
        winner,
        game_status: gameStatus,
        duration_seconds: durationSeconds,
        total_moves: totalMoves,
        board_state: boardState,
        completed_at: new Date()
      });

      const savedGame = await game.save();
      return savedGame;
    } catch (error) {
      console.error('Error saving game:', error);
      return null;
    }
  }

  async saveMove(gameId, moveData) {
    const { moveNumber, player, columnIndex, rowIndex } = moveData;
    
    try {
      const move = new GameMove({
        game_id: gameId,
        move_number: moveNumber,
        player,
        column_index: columnIndex,
        row_index: rowIndex
      });

      const savedMove = await move.save();
      return savedMove;
    } catch (error) {
      console.error('Error saving move:', error);
      return null;
    }
  }

  // Leaderboard methods
  async getLeaderboard(limit = 10) {
    try {
      const users = await User.aggregate([
        { $match: { games_played: { $gt: 0 } } },
        {
          $addFields: {
            win_percentage: {
              $round: [
                {
                  $multiply: [
                    { $divide: ['$games_won', '$games_played'] },
                    100
                  ]
                },
                2
              ]
            }
          }
        },
        {
          $sort: {
            games_won: -1,
            win_percentage: -1,
            games_played: -1
          }
        },
        { $limit: limit }
      ]);

      return users;
    } catch (error) {
      console.error('Error getting leaderboard:', error);
      return [];
    }
  }

  // Analytics methods
  async getGameAnalytics() {
    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const [totalGames, averageDuration, gamesPerDay, mostActiveUsers] = await Promise.all([
        Game.countDocuments(),
        Game.aggregate([
          { $match: { duration_seconds: { $exists: true, $ne: null } } },
          { $group: { _id: null, avg_duration: { $avg: '$duration_seconds' } } }
        ]),
        Game.aggregate([
          { $match: { created_at: { $gte: sevenDaysAgo } } },
          {
            $group: {
              _id: { $dateToString: { format: '%Y-%m-%d', date: '$created_at' } },
              count: { $sum: 1 }
            }
          },
          { $sort: { _id: -1 } }
        ]),
        User.find({ games_played: { $gt: 0 } })
          .sort({ games_played: -1 })
          .limit(5)
          .select('username games_played')
      ]);

      return {
        totalGames: [{ count: totalGames }],
        averageDuration: averageDuration,
        gamesPerDay: gamesPerDay.map(item => ({ date: item._id, count: item.count })),
        mostActiveUsers: mostActiveUsers.map(user => ({ username: user.username, games_played: user.games_played }))
      };
    } catch (error) {
      console.error('Error getting analytics:', error);
      return {};
    }
  }

  // Get game history for a user
  async getUserGameHistory(username, limit = 10) {
    try {
      const normalized = username.trim().toLowerCase();
      const games = await Game.find({
        $or: [
          { player1_username: normalized },
          { player2_username: normalized }
        ]
      })
      .sort({ completed_at: -1 })
      .limit(limit)
      .lean();
      return games.map(game => ({
        game_id: game.game_id,
        opponent: game.player1_username === normalized ? game.player2_username : game.player1_username,
        winner: game.winner,
        game_status: game.game_status,
        duration_seconds: game.duration_seconds,
        total_moves: game.total_moves,
        completed_at: game.completed_at
      }));
    } catch (error) {
      console.error('Error getting user game history:', error);
      return [];
    }
  }

  async close() {
    await mongoose.connection.close();
    this.connected = false;
    console.log('MongoDB connection closed');
  }

  // Health check
  async isHealthy() {
    try {
      await mongoose.connection.db.admin().ping();
      return true;
    } catch (error) {
      return false;
    }
  }
}

module.exports = Database;