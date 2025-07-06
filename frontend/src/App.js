import React, { useState, useEffect } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import socketService from './services/socketService';
import WelcomeScreen from './components/WelcomeScreen';
import GameBoard from './components/GameBoard';
import Leaderboard from './components/Leaderboard';
import UserStats from './components/UserStats';
import { Users, Trophy, BarChart3, Gamepad2 } from 'lucide-react';

function App() {
  const [gameState, setGameState] = useState('welcome'); // 'welcome', 'waiting', 'playing', 'leaderboard', 'stats'
  const [username, setUsername] = useState('');
  const [currentGame, setCurrentGame] = useState(null);
  const [playerNumber, setPlayerNumber] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [leaderboard, setLeaderboard] = useState([]);
  const [userStats, setUserStats] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Connect to socket server
    try {
      socketService.connect();
    } catch (error) {
      console.error('Failed to connect to socket server:', error);
      toast.error('Failed to connect to game server');
      setConnectionStatus('disconnected');
    }

    // Set up socket event listeners
    socketService.on('connect', () => {
      console.log('✅ Frontend: Socket connected successfully');
      setConnectionStatus('connected');
      toast.success('Connected to game server!');
    });

    socketService.on('disconnect', () => {
      console.log('❌ Frontend: Socket disconnected');
      setConnectionStatus('disconnected');
      setIsLoading(false);
      toast.error('Disconnected from server');
    });

    socketService.onWaitingForOpponent((data) => {
      console.log('🎮 Frontend: Received waiting_for_opponent event:', data);
      setGameState('waiting');
      setIsLoading(false);
      toast.info('Waiting for opponent... Bot will join in 10 seconds if no player found.');
    });

    socketService.onGameStarted((data) => {
      console.log('🎮 Frontend: Received game_started event:', data);
      setCurrentGame(data);
      setGameState('playing');
      setIsLoading(false);
      toast.success(`Game started! Playing against ${data.player2}`);
    });

    socketService.onPlayerNumber((data) => {
      setPlayerNumber(data.playerNumber);
    });

    socketService.onGameUpdate((data) => {
      setCurrentGame(prev => ({ ...prev, ...data }));
      
      if (data.gameStatus === 'won') {
        const winner = data.winner;
        if (winner === username) {
          toast.success('🎉 You won!');
        } else {
          toast.error('😞 You lost!');
        }
      } else if (data.gameStatus === 'draw') {
        toast.info('🤝 Game ended in a draw!');
      } else if (data.gameStatus === 'forfeited') {
        toast.warning('Game forfeited');
      }
    });

    socketService.onGameReconnected((data) => {
      setCurrentGame(data);
      setGameState('playing');
      setPlayerNumber(data.player1 === username ? 1 : 2);
      toast.success('Reconnected to game!');
    });

    socketService.onLeaderboard((data) => {
      setLeaderboard(data.leaderboard);
    });

    socketService.onUserStats((data) => {
      setUserStats(data);
    });

    socketService.onError((error) => {
      setIsLoading(false);
      toast.error(error.message || 'An error occurred');
    });

    // Set a timeout to show connection error if it takes too long
    const connectionTimeout = setTimeout(() => {
      if (connectionStatus === 'connecting') {
        setConnectionStatus('disconnected');
        toast.error('Connection timeout. Please check if the server is running.');
      }
    }, 10000); // 10 seconds timeout

    return () => {
      clearTimeout(connectionTimeout);
    };
  }, []); // Remove username from dependency array

  // Cleanup effect that only runs on unmount
  useEffect(() => {
    return () => {
      socketService.disconnect();
    };
  }, []);

  const handleJoinGame = (enteredUsername) => {
    console.log('🎮 Frontend: handleJoinGame called with username:', enteredUsername);
    console.log('🔌 Frontend: Connection status:', connectionStatus);
    
    if (!enteredUsername.trim()) {
      toast.error('Please enter a username');
      return;
    }

    if (connectionStatus !== 'connected') {
      console.log('❌ Frontend: Cannot join game - not connected');
      toast.error('Not connected to server. Please wait.');
      return;
    }

    console.log('✅ Frontend: Proceeding with join game');
    setIsLoading(true);
    setUsername(enteredUsername.trim());
    
    try {
      socketService.joinGame(enteredUsername.trim());
    } catch (error) {
      console.error('Failed to join game:', error);
      toast.error('Failed to join game. Please try again.');
      setIsLoading(false);
    }
  };

  const handleMakeMove = (column) => {
    if (currentGame && currentGame.gameId) {
      try {
        socketService.makeMove(currentGame.gameId, column);
      } catch (error) {
        console.error('Failed to make move:', error);
        toast.error('Failed to make move. Please try again.');
      }
    } else {
      toast.error('Game not ready. Please wait.');
    }
  };

  const handleNewGame = () => {
    setGameState('welcome');
    setCurrentGame(null);
    setPlayerNumber(null);
    setUsername('');
  };

  const handleShowLeaderboard = () => {
    setGameState('leaderboard');
    socketService.getLeaderboard();
  };

  const handleShowStats = () => {
    if (username) {
      setGameState('stats');
      socketService.getUserStats(username);
    } else {
      toast.error('Please join a game first');
    }
  };

  const handleBackToMenu = () => {
    setGameState('welcome');
  };

  const renderCurrentScreen = () => {
    switch (gameState) {
      case 'welcome':
        return (
          <WelcomeScreen
            onJoinGame={handleJoinGame}
            onShowLeaderboard={handleShowLeaderboard}
            connectionStatus={connectionStatus}
            isLoading={isLoading}
          />
        );
      
      case 'waiting':
        return (
          <div className="flex flex-col items-center justify-center min-h-screen p-8">
            <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto mb-6"></div>
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Finding Opponent...</h2>
              <p className="text-gray-600 mb-4">Player: <span className="font-semibold text-indigo-600">{username}</span></p>
              <p className="text-sm text-gray-500">
                Searching for another player. If no player joins within 10 seconds, 
                you'll be matched with our competitive bot!
              </p>
              <button
                onClick={handleNewGame}
                className="mt-6 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        );
      
      case 'playing':
        return (
          <GameBoard
            game={currentGame}
            username={username}
            playerNumber={playerNumber}
            onMakeMove={handleMakeMove}
            onNewGame={handleNewGame}
            onShowStats={handleShowStats}
          />
        );
      
      case 'leaderboard':
        return (
          <Leaderboard
            leaderboard={leaderboard}
            onBack={handleBackToMenu}
          />
        );
      
      case 'stats':
        return (
          <UserStats
            stats={userStats}
            username={username}
            onBack={handleBackToMenu}
          />
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500">
      {/* Header */}
      <header className="bg-white/10 backdrop-blur-md border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-2">
              <Gamepad2 className="h-8 w-8 text-white" />
              <h1 className="text-2xl font-bold text-white">4-in-a-Row</h1>
            </div>
            
            {gameState !== 'welcome' && (
              <div className="flex items-center space-x-4">
                <button
                  onClick={handleShowLeaderboard}
                  className="flex items-center space-x-2 px-3 py-2 bg-white/20 text-white rounded-lg hover:bg-white/30 transition-colors"
                  disabled={gameState === 'leaderboard'}
                >
                  <Trophy className="h-4 w-4" />
                  <span>Leaderboard</span>
                </button>
                
                {username && (
                  <button
                    onClick={handleShowStats}
                    className="flex items-center space-x-2 px-3 py-2 bg-white/20 text-white rounded-lg hover:bg-white/30 transition-colors"
                    disabled={gameState === 'stats'}
                  >
                    <BarChart3 className="h-4 w-4" />
                    <span>My Stats</span>
                  </button>
                )}
                
                <div className="flex items-center space-x-2 text-white">
                  <div className={`w-2 h-2 rounded-full ${connectionStatus === 'connected' ? 'bg-green-400' : 'bg-red-400'}`} />
                  <span className="text-sm">{connectionStatus}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main>
        {renderCurrentScreen()}
      </main>

      {/* Toast Notifications */}
      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
    </div>
  );
}

export default App; 