const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const config = require('./config');
const Database = require('./models/Database');
const KafkaService = require('./services/KafkaService');
const GameManager = require('./services/GameManager');

class GameServer {
  constructor() {
    this.app = express();
    this.server = http.createServer(this.app);
    this.io = socketIo(this.server, {
      cors: {
        origin: config.server.nodeEnv === 'development' ? true : config.server.corsOrigin,
        methods: ["GET", "POST"],
        credentials: true
      }
    });

    this.database = new Database();
    this.kafka = new KafkaService();
    this.gameManager = null;

    this.setupMiddleware();
    this.setupRoutes();
    this.setupSocketHandlers();
  }

  setupMiddleware() {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: false, // Disable for development
    }));

    // Rate limiting
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100 // limit each IP to 100 requests per windowMs
    });
    this.app.use('/api/', limiter);

    // CORS
    this.app.use(cors({
      origin: config.server.nodeEnv === 'development' ? true : config.server.corsOrigin,
      credentials: true
    }));

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));

    // Logging middleware
    this.app.use((req, res, next) => {
      console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
      next();
    });
  }

  setupRoutes() {
    // Health check endpoint
    this.app.get('/health', async (req, res) => {
      const health = {
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        database: await this.database.isHealthy(),
        kafka: this.kafka.isConnected(),
        activeGames: this.gameManager ? this.gameManager.getGameStats() : null
      };

      const statusCode = health.database && health.kafka ? 200 : 503;
      res.status(statusCode).json(health);
    });

    // API Routes
    this.app.use('/api', this.createApiRoutes());

    // Serve static files (for production)
    if (config.server.nodeEnv === 'production') {
      this.app.use(express.static('public'));
      
      this.app.get('*', (req, res) => {
        res.sendFile(path.join(__dirname, 'public', 'index.html'));
      });
    }

    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({ error: 'Route not found' });
    });

    // Error handler
    this.app.use((err, req, res, next) => {
      console.error('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    });
  }

  createApiRoutes() {
    const router = express.Router();

    // Get leaderboard
    router.get('/leaderboard', async (req, res) => {
      try {
        const limit = parseInt(req.query.limit) || 10;
        const leaderboard = await this.database.getLeaderboard(limit);
        res.json({ leaderboard });
      } catch (error) {
        console.error('Error getting leaderboard:', error);
        res.status(500).json({ error: 'Failed to get leaderboard' });
      }
    });

    // Get user statistics
    router.get('/users/:username/stats', async (req, res) => {
      try {
        const { username } = req.params;
        const stats = await this.database.getUserStats(username);
        const gameHistory = await this.database.getUserGameHistory(username, 10);
        
        res.json({ 
          stats: stats || { username, games_played: 0, games_won: 0, games_lost: 0, games_drawn: 0 },
          gameHistory 
        });
      } catch (error) {
        console.error('Error getting user stats:', error);
        res.status(500).json({ error: 'Failed to get user stats' });
      }
    });

    // Get game analytics (if Kafka is connected)
    router.get('/analytics', async (req, res) => {
      try {
        if (!this.kafka.isConnected()) {
          return res.status(503).json({ error: 'Analytics service unavailable' });
        }

        const analytics = this.kafka.getAnalytics();
        const dbAnalytics = await this.database.getGameAnalytics();
        
        res.json({
          realTime: analytics,
          database: dbAnalytics,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error('Error getting analytics:', error);
        res.status(500).json({ error: 'Failed to get analytics' });
      }
    });

    // Get current server statistics
    router.get('/stats', (req, res) => {
      const stats = {
        server: {
          uptime: process.uptime(),
          nodeEnv: config.server.nodeEnv,
          nodeVersion: process.version,
          platform: process.platform
        },
        game: this.gameManager ? this.gameManager.getGameStats() : null,
        database: {
          connected: this.database.connected
        },
        kafka: {
          connected: this.kafka.isConnected()
        }
      };

      res.json(stats);
    });

    // Create a test user (for development/testing)
    router.post('/users', async (req, res) => {
      try {
        const { username } = req.body;
        
        if (!username || username.trim() === '') {
          return res.status(400).json({ error: 'Username is required' });
        }

        const user = await this.database.createOrUpdateUser(username.trim());
        res.json({ user });
      } catch (error) {
        console.error('Error creating user:', error);
        res.status(500).json({ error: 'Failed to create user' });
      }
    });

    return router;
  }

  setupSocketHandlers() {
    this.io.on('connection', (socket) => {
      if (this.gameManager) {
        this.gameManager.handleConnection(socket);
      }
    });
  }

  async start() {
    try {
      console.log('🚀 Starting 4-in-a-Row Game Server...');
      
      // Connect to database
      console.log('📦 Connecting to database...');
      await this.database.connect();
      
      // Connect to Kafka (optional, continue without it)
      console.log('📡 Connecting to Kafka...');
      await this.kafka.connect();
      
      // Initialize game manager
      console.log('🎮 Initializing game manager...');
      this.gameManager = new GameManager(this.io, this.database, this.kafka);
      
      // Start the server
      const port = config.server.port;
      this.server.listen(port, () => {
        console.log(`✅ Server running on port ${port}`);
        console.log(`🌐 WebSocket server ready`);
        console.log(`💾 Database: ${this.database.connected ? 'Connected' : 'Disconnected'}`);
        console.log(`📡 Kafka: ${this.kafka.isConnected() ? 'Connected' : 'Disconnected'}`);
        console.log(`🎯 Environment: ${config.server.nodeEnv}`);
        console.log(`🔗 CORS Origin: ${config.server.corsOrigin}`);
        console.log('\n🎮 Game Server Ready! Players can now connect.\n');
      });

    } catch (error) {
      console.error('❌ Failed to start server:', error);
      process.exit(1);
    }
  }

  async stop() {
    console.log('🛑 Shutting down server...');
    
    if (this.gameManager) {
      await this.gameManager.cleanup();
    }
    
    if (this.kafka) {
      await this.kafka.disconnect();
    }
    
    if (this.database) {
      await this.database.close();
    }
    
    this.server.close(() => {
      console.log('✅ Server shutdown complete');
      process.exit(0);
    });
  }
}

// Handle graceful shutdown
const server = new GameServer();

process.on('SIGTERM', () => server.stop());
process.on('SIGINT', () => server.stop());

// Start the server
server.start().catch(console.error);

module.exports = GameServer; 