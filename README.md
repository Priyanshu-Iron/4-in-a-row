# 4-in-a-Row Game

A real-time multiplayer **4-in-a-Row** (Connect Four) game with competitive AI, built using the MERN stack with advanced features including Kafka analytics, MongoDB persistence, and WebSocket real-time gameplay.

## 🎮 Live Demo

[**Play Now**](https://fourinarow-game.vercel.app) - *Live deployment available*

## 🚀 Features

### Core Gameplay
- **Real-time multiplayer** gameplay using WebSockets
- **7×6 game board** with classic Connect Four rules
- **Competitive AI bot** with minimax algorithm (not random moves)
- **10-second matchmaking** with automatic bot fallback
- **30-second reconnection** window for disconnected players
- **Win detection** for horizontal, vertical, and diagonal connections

### Advanced Features
- **Player statistics** and game history tracking
- **Leaderboard** with real-time rankings
- **Kafka integration** for game analytics and events
- **MongoDB database** for persistent data storage
- **Modern React UI** with beautiful animations
- **Real-time notifications** and game status updates
- **Mobile-responsive** design

### Technical Highlights
- **Strategic AI** that prioritizes winning and blocking moves
- **In-memory game state** management for active games
- **Database persistence** for completed games and user stats
- **Analytics service** for gameplay metrics
- **Rate limiting** and security middleware
- **Docker-ready** configuration

## 🛠 Tech Stack

### Backend
- **Node.js** with Express.js
- **Socket.io** for real-time WebSocket communication
- **MongoDB** with Mongoose for data persistence
- **Kafka** for event-driven analytics
- **Strategic AI** with minimax algorithm

### Frontend
- **React** with modern hooks and functional components
- **Socket.io-client** for real-time communication
- **Tailwind CSS** for styling
- **React Toastify** for notifications
- **Lucide React** for icons

### Infrastructure
- **CORS** enabled for cross-origin requests
- **Helmet** for security headers
- **Rate limiting** for API protection
- **Environment-based configuration**

## 📦 Installation

### Prerequisites
- Node.js (v16+ recommended)
- MongoDB (v5+ recommended)
- Apache Kafka (optional, for analytics)
- npm or yarn

### 1. Clone the Repository
```bash
git clone https://github.com/connect4-multiplayer/4-in-a-row.git
cd 4-in-a-row
```

### 2. Install Dependencies
```bash
# Install root dependencies
npm install

# Install all dependencies (root, backend, frontend)
npm run install-all
```

### 3. Database Setup
```bash
# Start MongoDB (if not already running)
# On macOS with Homebrew:
brew services start mongodb-community

# On Ubuntu/Debian:
sudo systemctl start mongod

# On Windows:
# Start MongoDB service from Services

# The application will automatically create collections on first run
```

### 4. Environment Configuration

Create a `.env` file in the `backend` directory:

```env
# Server Configuration
PORT=3001
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000

# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/four_in_a_row

# Kafka Configuration (Optional)
KAFKA_BROKER=localhost:9092
KAFKA_CLIENT_ID=4-in-a-row-backend
KAFKA_TOPIC_GAME_EVENTS=game-events
KAFKA_TOPIC_USER_EVENTS=user-events

# Game Configuration
MATCHMAKING_TIMEOUT=10000
RECONNECTION_TIMEOUT=30000
BOT_MOVE_DELAY=1000
```

### 5. Start Kafka (Optional)
```bash
# Start Zookeeper
bin/zookeeper-server-start.sh config/zookeeper.properties

# Start Kafka
bin/kafka-server-start.sh config/server.properties

# Create topics
bin/kafka-topics.sh --create --topic game-events --bootstrap-server localhost:9092
bin/kafka-topics.sh --create --topic user-events --bootstrap-server localhost:9092
```

### 6. Run the Application

**Development Mode:**
```bash
# Start both backend and frontend
npm run dev

# Or start individually
npm run backend:dev    # Backend on http://localhost:3001
npm run frontend:dev   # Frontend on http://localhost:3000
```

**Production Mode:**
```bash
# Build frontend
npm run frontend:build

# Start production server
npm start
```

### Docker Setup (Recommended)

The easiest way to run the entire application is using Docker Compose:

```bash
# Start all services (MongoDB, Backend, Frontend, Kafka)
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down

# Stop and remove volumes (clears database)
docker-compose down -v
```

This will start:
- **MongoDB** on port 27017
- **Backend** on port 3001
- **Frontend** on port 3000
- **Kafka** on port 29092
- **Zookeeper** (for Kafka)

## 🎯 How to Play

1. **Enter Username**: Choose a unique username to join the game
2. **Matchmaking**: Wait for an opponent (max 10 seconds)
3. **Bot Fallback**: If no player joins, you'll play against our competitive AI
4. **Make Moves**: Click on columns to drop your discs
5. **Win Condition**: Connect 4 discs horizontally, vertically, or diagonally
6. **Reconnection**: If disconnected, you have 30 seconds to reconnect

## 🤖 AI Bot Features

The competitive bot uses advanced algorithms:

- **Minimax Algorithm** with alpha-beta pruning
- **Strategic Prioritization**:
  1. Win immediately if possible
  2. Block opponent's winning moves
  3. Create strategic positions
- **Board Evaluation** considering:
  - Winning patterns
  - Blocking opportunities
  - Center column preference
  - Future move potential

## 📊 API Endpoints

### Game API
- `GET /health` - Server health check
- `GET /api/leaderboard` - Get top players
- `GET /api/users/:username/stats` - Get user statistics
- `GET /api/analytics` - Get game analytics (if Kafka enabled)
- `GET /api/stats` - Get server statistics
- `POST /api/users` - Create/update user

### WebSocket Events

**Client to Server:**
- `join_game` - Join matchmaking queue
- `make_move` - Make a game move
- `reconnect_game` - Reconnect to existing game
- `get_leaderboard` - Request leaderboard
- `get_user_stats` - Request user statistics

**Server to Client:**
- `waiting_for_opponent` - Waiting for matchmaking
- `game_started` - Game has begun
- `game_update` - Real-time game state update
- `game_reconnected` - Successfully reconnected
- `your_player_number` - Your player assignment
- `leaderboard` - Leaderboard data
- `user_stats` - User statistics data
- `error` - Error messages

## 📈 Analytics Features

When Kafka is enabled, the system tracks:

### Game Metrics
- Total games played
- Average game duration
- Games per hour/day
- Game outcomes (wins/draws/forfeitures)

### User Metrics
- Player performance statistics
- Most active players
- Win rates and patterns
- Connection/disconnection events

### Bot Performance
- Bot move thinking time
- Bot win rate
- Strategic decision tracking

## 🏗 Project Structure

```
4-in-a-row/
├── backend/
│   ├── config.js              # Configuration management
│   ├── server.js              # Main server file
│   ├── models/
│   │   ├── GameLogic.js       # Core game mechanics
│   │   ├── BotAI.js          # AI bot implementation
│   │   └── Database.js        # Database operations
│   └── services/
│       ├── GameManager.js     # Game state management
│       └── KafkaService.js    # Analytics service
├── frontend/
│   ├── src/
│   │   ├── App.js            # Main React component
│   │   ├── components/
│   │   │   ├── WelcomeScreen.js
│   │   │   ├── GameBoard.js
│   │   │   ├── Leaderboard.js
│   │   │   └── UserStats.js
│   │   └── services/
│   │       └── socketService.js
│   ├── public/
│   └── tailwind.config.js
├── package.json
└── README.md
```

## 🔧 Configuration Options

### Game Settings
- `MATCHMAKING_TIMEOUT`: Time to wait for opponent (default: 10 seconds)
- `RECONNECTION_TIMEOUT`: Time allowed for reconnection (default: 30 seconds)
- `BOT_MOVE_DELAY`: Bot thinking time (default: 1 second)

### Board Configuration
- Board size: 7 columns × 6 rows (configurable in `config.js`)
- Win condition: 4 in a row (configurable)

## 🚀 Deployment

### Using Docker (Recommended)

1. **Create Dockerfile for Backend:**
```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY backend/package*.json ./
RUN npm install
COPY backend/ .
EXPOSE 3001
CMD ["npm", "start"]
```

2. **Create Dockerfile for Frontend:**
```dockerfile
FROM node:16-alpine as build
WORKDIR /app
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html
EXPOSE 80
```

### Environment Variables for Production
```env
NODE_ENV=production
PORT=3001
DB_HOST=your-production-db-host
KAFKA_BROKER=your-kafka-broker
CORS_ORIGIN=https://your-frontend-domain.com
```

## 🧪 Testing

```bash
# Run backend tests
cd backend && npm test

# Run frontend tests
cd frontend && npm test
```

## 🔍 Troubleshooting

### Common Issues

1. **Database Connection Failed**
   - Ensure PostgreSQL is running
   - Check database credentials in `.env`
   - Verify database exists

2. **Kafka Connection Failed**
   - Kafka is optional - the app will work without it
   - Ensure Kafka and Zookeeper are running
   - Check broker configuration

3. **WebSocket Connection Issues**
   - Check CORS configuration
   - Verify backend server is running
   - Check firewall settings

4. **Bot Not Making Moves**
   - Check game state in database
   - Verify bot AI logic
   - Check server logs for errors

## 📋 TODO / Future Enhancements

- [ ] **Tournament Mode** with bracket system
- [ ] **Spectator Mode** for watching games
- [ ] **Chat System** during gameplay
- [ ] **Game Replays** with move-by-move playback
- [ ] **Different Board Sizes** (5×4, 8×7, etc.)
- [ ] **AI Difficulty Levels**
- [ ] **Sound Effects** and animations
- [ ] **Mobile App** using React Native
- [ ] **Social Features** (friend lists, challenges)
- [ ] **Game Themes** and customization

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 Authors

- **Connect4 Team** - Initial development - [GitHub](https://github.com/connect4-multiplayer)

## 🙏 Acknowledgments

- Inspired by the classic Connect Four game
- Built as an engineering intern assignment
- Thanks to the open-source community for the amazing tools and libraries

## 📞 Support

If you have any questions or need help:

1. **GitHub Issues**: [Create an issue](https://github.com/connect4-multiplayer/4-in-a-row/issues)
2. **Documentation**: Check this README and inline code comments

---

**Happy Gaming! 🎮**

*Built with ❤️ using Node.js, React, PostgreSQL, and Kafka* 