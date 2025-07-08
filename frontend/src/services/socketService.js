import io from 'socket.io-client';

class SocketService {
  constructor() {
    this.socket = null;
    this.connected = false;
    this.listeners = new Map();
    
    // Better environment variable handling
    this.serverUrl = process.env.REACT_APP_SOCKET_URL || 
                     process.env.REACT_APP_BACKEND_URL || 
                     'http://localhost:3001';
    
    console.log('🌐 Socket server URL:', this.serverUrl);
    console.log('🌐 Environment variables:', {
      REACT_APP_SOCKET_URL: process.env.REACT_APP_SOCKET_URL,
      REACT_APP_BACKEND_URL: process.env.REACT_APP_BACKEND_URL,
      NODE_ENV: process.env.NODE_ENV
    });
  }

  connect() {
    if (this.socket && this.socket.connected) {
      console.log('🔌 Socket already connected, reusing existing connection');
      return this.socket;
    }

    if (this.socket) {
      console.log('🔌 Disconnecting existing socket before creating new one');
      this.socket.disconnect();
    }

    console.log('🔌 Creating new socket connection to:', this.serverUrl);
    this.socket = io(this.serverUrl, {
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      timeout: 20000,
      // Remove 'websocket' from transports for better compatibility with Render
      transports: ['polling', 'websocket'],
      withCredentials: false, // Set to false for cross-origin
      // Add these options for better HTTPS compatibility
      secure: this.serverUrl.startsWith('https://'),
      rejectUnauthorized: false
    });

    this.socket.on('connect', () => {
      console.log('🔌 Connected to game server');
      this.connected = true;
    });

    this.socket.on('disconnect', (reason) => {
      console.log('🔌 Disconnected from game server:', reason);
      this.connected = false;
    });

    this.socket.on('connect_error', (error) => {
      console.error('🔌 Connection error:', error);
      console.error('🔌 Trying to connect to:', this.serverUrl);
      this.connected = false;
    });

    this.socket.on('reconnect', (attemptNumber) => {
      console.log('🔌 Reconnected to game server after', attemptNumber, 'attempts');
      this.connected = true;
    });

    this.socket.on('reconnect_error', (error) => {
      console.error('🔌 Reconnection error:', error);
    });

    this.socket.on('reconnect_failed', () => {
      console.error('🔌 Reconnection failed after all attempts');
      this.connected = false;
    });

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connected = false;
      this.listeners.clear();
    }
  }

  joinGame(username, vsBot = false) {
    console.log('🎮 Attempting to join game with username:', username, 'vsBot:', vsBot);
    console.log('🔌 Socket connected:', this.socket?.connected);
    console.log('🔌 Connection status:', this.connected);
    
    if (this.socket && this.socket.connected) {
      console.log('🎮 Emitting join_game event');
      this.socket.emit('join_game', { username, vsBot });
    } else {
      console.error('🎮 Cannot join game: socket not connected');
      throw new Error('Socket not connected');
    }
  }

  makeMove(gameId, column) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('make_move', { gameId, column });
    } else {
      throw new Error('Socket not connected');
    }
  }

  reconnectToGame(username, gameId = null) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('reconnect_game', { username, gameId });
    }
  }

  getLeaderboard() {
    if (this.socket && this.socket.connected) {
      this.socket.emit('get_leaderboard');
    }
  }

  getUserStats(username) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('get_user_stats', { username });
    }
  }

  on(event, callback) {
    if (this.socket) {
      this.socket.on(event, callback);
      if (!this.listeners.has(event)) {
        this.listeners.set(event, []);
      }
      this.listeners.get(event).push(callback);
    }
  }

  off(event, callback) {
    if (this.socket) {
      this.socket.off(event, callback);
      if (this.listeners.has(event)) {
        const callbacks = this.listeners.get(event);
        const index = callbacks.indexOf(callback);
        if (index > -1) {
          callbacks.splice(index, 1);
        }
      }
    }
  }

  removeAllListeners(event) {
    if (this.socket) {
      this.socket.removeAllListeners(event);
      this.listeners.delete(event);
    }
  }

  isConnected() {
    return this.connected && this.socket?.connected;
  }

  onWaitingForOpponent(callback) {
    this.on('waiting_for_opponent', callback);
  }

  onGameStarted(callback) {
    this.on('game_started', callback);
  }

  onGameUpdate(callback) {
    this.on('game_update', callback);
  }

  onGameReconnected(callback) {
    this.on('game_reconnected', callback);
  }

  onPlayerNumber(callback) {
    this.on('your_player_number', callback);
  }

  onLeaderboard(callback) {
    this.on('leaderboard', callback);
  }

  onUserStats(callback) {
    this.on('user_stats', callback);
  }

  onError(callback) {
    this.on('error', callback);
  }
}

const socketService = new SocketService();
export default socketService;