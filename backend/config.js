require('dotenv').config();

const config = {
  server: {
    port: process.env.PORT || 3001,
    nodeEnv: process.env.NODE_ENV || 'development',
    corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000'
  },
  
  database: {
    url: process.env.MONGODB_URI || 'mongodb://localhost:27017/four_in_a_row',
    options: {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    }
  },
  
  kafka: {
    broker: process.env.KAFKA_BROKER || 'localhost:9092',
    clientId: process.env.KAFKA_CLIENT_ID || '4-in-a-row-backend',
    gameEventsTopic: process.env.KAFKA_TOPIC_GAME_EVENTS || 'game-events',
    userEventsTopic: process.env.KAFKA_TOPIC_USER_EVENTS || 'user-events'
  },
  
  game: {
    matchmakingTimeout: parseInt(process.env.MATCHMAKING_TIMEOUT) || 10000, // 10 seconds
    reconnectionTimeout: parseInt(process.env.RECONNECTION_TIMEOUT) || 30000, // 30 seconds
    botMoveDelay: parseInt(process.env.BOT_MOVE_DELAY) || 1000, // 1 second
    boardWidth: 7,
    boardHeight: 6,
    winCondition: 4
  }
};

module.exports = config; 