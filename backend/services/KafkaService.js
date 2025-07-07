require('dotenv').config();
const { Kafka } = require('kafkajs');
const config = require('../config');

class KafkaService {
  constructor() {
    const fs = require('fs');

    let sslOptions = false;

    if (config.kafka.ssl === 'true') {
      const caPath = config.kafka.sslCa;
      const keyPath = config.kafka.sslKey;
      const certPath = config.kafka.sslCert;

      if (fs.existsSync(caPath)) {
        sslOptions = {
          rejectUnauthorized: true,
          ca: [fs.readFileSync(caPath, 'utf-8')],
          key: fs.existsSync(keyPath) ? fs.readFileSync(keyPath, 'utf-8') : undefined,
          cert: fs.existsSync(certPath) ? fs.readFileSync(certPath, 'utf-8') : undefined
        };
      } else {
        console.warn(`⚠️ Kafka SSL enabled, but CA file not found at ${caPath}`);
      }
    }
    
    const saslOptions = (config.kafka.saslMechanism && config.kafka.saslUsername && config.kafka.saslPassword) ? {
      mechanism: config.kafka.saslMechanism,
      username: config.kafka.saslUsername,
      password: config.kafka.saslPassword
    } : undefined;

    this.kafka = new Kafka({
      clientId: config.kafka.clientId,
      brokers: [config.kafka.broker],
      ssl: sslOptions,
      sasl: saslOptions,
      retry: {
        initialRetryTime: 100,
        retries: 8
      }
    });


    this.producer = this.kafka.producer();
    this.consumer = this.kafka.consumer({ 
      groupId: 'analytics-group',
      sessionTimeout: 30000,
      heartbeatInterval: 3000
    });
    
    this.connected = false;
    this.analytics = {
      totalGames: 0,
      totalMoves: 0,
      averageGameDuration: 0,
      gamesPerHour: {},
      userMetrics: {},
      gameResults: { wins: 0, draws: 0, forfeitures: 0 }
    };
  }

  async connect() {
    try {
      await this.producer.connect();
      await this.consumer.connect();
      
      // Subscribe to both game and user event topics
      await this.consumer.subscribe({ 
        topics: [config.kafka.gameEventsTopic, config.kafka.userEventsTopic]
      });
      
      this.connected = true;
      console.log('✅ Kafka connected successfully');
      
      // Start consuming messages for analytics
      this.startAnalyticsConsumer();
      
    } catch (error) {
      console.error('❌ Kafka connection failed:', error.message);
      console.log('ℹ️  Make sure Kafka is running on', config.kafka.broker);
    }
  }

  async startAnalyticsConsumer() {
    await this.consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        try {
          const event = JSON.parse(message.value.toString());
          await this.processAnalyticsEvent(event);
        } catch (error) {
          console.error('Error processing Kafka message:', error);
        }
      },
    });
  }

  async processAnalyticsEvent(event) {
    const { type, data, timestamp } = event;
    
    switch (type) {
      case 'game_started':
        this.handleGameStarted(data, timestamp);
        break;
      case 'game_ended':
        this.handleGameEnded(data, timestamp);
        break;
      case 'move_made':
        this.handleMoveMade(data, timestamp);
        break;
      case 'player_joined':
        this.handlePlayerJoined(data, timestamp);
        break;
      case 'player_disconnected':
        this.handlePlayerDisconnected(data, timestamp);
        break;
      case 'bot_move':
        this.handleBotMove(data, timestamp);
        break;
      default:
        console.log('Unknown event type:', type);
    }
  }

  handleGameStarted(data, timestamp) {
    this.analytics.totalGames++;
    
    // Track games per hour
    const hour = new Date(timestamp).getHours();
    this.analytics.gamesPerHour[hour] = (this.analytics.gamesPerHour[hour] || 0) + 1;
    
    // Initialize user metrics if needed
    if (data.player1 && !data.player1.includes('Bot')) {
      this.initUserMetrics(data.player1);
    }
    if (data.player2 && !data.player2.includes('Bot')) {
      this.initUserMetrics(data.player2);
    }
    
    console.log(`📊 Game started: ${data.gameId} (Total: ${this.analytics.totalGames})`);
  }

  handleGameEnded(data, timestamp) {
    const { gameStatus, winner, durationSeconds, totalMoves } = data;
    
    // Update game result statistics
    if (gameStatus === 'won') {
      this.analytics.gameResults.wins++;
    } else if (gameStatus === 'draw') {
      this.analytics.gameResults.draws++;
    } else if (gameStatus === 'forfeited') {
      this.analytics.gameResults.forfeitures++;
    }
    
    // Update average game duration
    if (durationSeconds) {
      const totalDuration = this.analytics.averageGameDuration * (this.analytics.totalGames - 1);
      this.analytics.averageGameDuration = (totalDuration + durationSeconds) / this.analytics.totalGames;
    }
    
    // Update user metrics
    if (data.player1 && !data.player1.includes('Bot')) {
      this.updateUserGameMetrics(data.player1, gameStatus, winner, durationSeconds);
    }
    if (data.player2 && !data.player2.includes('Bot')) {
      this.updateUserGameMetrics(data.player2, gameStatus, winner, durationSeconds);
    }
    
    console.log(`📊 Game ended: ${data.gameId}, Status: ${gameStatus}, Winner: ${winner || 'None'}`);
  }

  handleMoveMade(data, timestamp) {
    this.analytics.totalMoves++;
    
    // Update user move metrics
    if (data.player && !data.player.includes('Bot')) {
      const userMetrics = this.analytics.userMetrics[data.player];
      if (userMetrics) {
        userMetrics.totalMoves++;
        userMetrics.averageThinkTime = this.updateAverage(
          userMetrics.averageThinkTime,
          userMetrics.totalMoves,
          data.thinkTime || 0
        );
      }
    }
  }

  handlePlayerJoined(data, timestamp) {
    if (data.username && !data.username.includes('Bot')) {
      this.initUserMetrics(data.username);
      console.log(`👤 Player joined: ${data.username}`);
    }
  }

  handlePlayerDisconnected(data, timestamp) {
    const userMetrics = this.analytics.userMetrics[data.username];
    if (userMetrics) {
      userMetrics.disconnections++;
    }
    console.log(`👤 Player disconnected: ${data.username}`);
  }

  handleBotMove(data, timestamp) {
    // Track bot performance metrics
    console.log(`🤖 Bot move: Column ${data.column}, Think time: ${data.thinkTime}ms`);
  }

  initUserMetrics(username) {
    if (!this.analytics.userMetrics[username]) {
      this.analytics.userMetrics[username] = {
        gamesPlayed: 0,
        gamesWon: 0,
        gamesLost: 0,
        gamesDrawn: 0,
        totalMoves: 0,
        averageGameDuration: 0,
        averageThinkTime: 0,
        disconnections: 0,
        firstSeen: new Date(),
        lastSeen: new Date()
      };
    }
    this.analytics.userMetrics[username].lastSeen = new Date();
  }

  updateUserGameMetrics(username, gameStatus, winner, durationSeconds) {
    const userMetrics = this.analytics.userMetrics[username];
    if (!userMetrics) return;
    
    userMetrics.gamesPlayed++;
    
    if (gameStatus === 'won') {
      if (winner === username) {
        userMetrics.gamesWon++;
      } else {
        userMetrics.gamesLost++;
      }
    } else if (gameStatus === 'draw') {
      userMetrics.gamesDrawn++;
    }
    
    if (durationSeconds) {
      userMetrics.averageGameDuration = this.updateAverage(
        userMetrics.averageGameDuration,
        userMetrics.gamesPlayed,
        durationSeconds
      );
    }
  }

  updateAverage(currentAverage, count, newValue) {
    return ((currentAverage * (count - 1)) + newValue) / count;
  }

  // Methods to publish events
  async publishGameEvent(eventType, data) {
    if (!this.connected) {
      console.log('Kafka not connected, skipping event:', eventType);
      return;
    }

    const event = {
      type: eventType,
      data,
      timestamp: new Date().toISOString(),
      source: 'game-server'
    };

    try {
      await this.producer.send({
        topic: config.kafka.gameEventsTopic,
        messages: [{
          key: data.gameId || data.username || 'system',
          value: JSON.stringify(event),
          timestamp: Date.now()
        }]
      });
    } catch (error) {
      console.error('Error publishing game event:', error);
    }
  }

  async publishUserEvent(eventType, data) {
    if (!this.connected) {
      console.log('Kafka not connected, skipping event:', eventType);
      return;
    }

    const event = {
      type: eventType,
      data,
      timestamp: new Date().toISOString(),
      source: 'game-server'
    };

    try {
      await this.producer.send({
        topic: config.kafka.userEventsTopic,
        messages: [{
          key: data.username || 'anonymous',
          value: JSON.stringify(event),
          timestamp: Date.now()
        }]
      });
    } catch (error) {
      console.error('Error publishing user event:', error);
    }
  }

  // Convenience methods for common events
  async gameStarted(gameData) {
    await this.publishGameEvent('game_started', gameData);
  }

  async gameEnded(gameData) {
    await this.publishGameEvent('game_ended', gameData);
  }

  async moveMade(moveData) {
    await this.publishGameEvent('move_made', moveData);
  }

  async playerJoined(playerData) {
    await this.publishUserEvent('player_joined', playerData);
  }

  async playerDisconnected(playerData) {
    await this.publishUserEvent('player_disconnected', playerData);
  }

  async botMove(botData) {
    await this.publishGameEvent('bot_move', botData);
  }

  // Get current analytics
  getAnalytics() {
    return {
      ...this.analytics,
      mostActiveHour: this.getMostActiveHour(),
      topPlayers: this.getTopPlayers(),
      currentDateTime: new Date().toISOString()
    };
  }

  getMostActiveHour() {
    let maxGames = 0;
    let mostActiveHour = 0;
    
    for (const [hour, count] of Object.entries(this.analytics.gamesPerHour)) {
      if (count > maxGames) {
        maxGames = count;
        mostActiveHour = parseInt(hour);
      }
    }
    
    return { hour: mostActiveHour, games: maxGames };
  }

  getTopPlayers(limit = 5) {
    return Object.entries(this.analytics.userMetrics)
      .map(([username, metrics]) => ({
        username,
        ...metrics,
        winRate: metrics.gamesPlayed > 0 ? (metrics.gamesWon / metrics.gamesPlayed * 100).toFixed(1) : 0
      }))
      .sort((a, b) => b.gamesWon - a.gamesWon)
      .slice(0, limit);
  }

  async disconnect() {
    try {
      await this.producer.disconnect();
      await this.consumer.disconnect();
      this.connected = false;
      console.log('Kafka disconnected');
    } catch (error) {
      console.error('Error disconnecting Kafka:', error);
    }
  }

  isConnected() {
    return this.connected;
  }
}

module.exports = KafkaService; 