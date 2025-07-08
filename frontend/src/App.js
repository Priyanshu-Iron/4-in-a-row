import React, { useState, useEffect, useRef } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import socketService from './services/socketService';
import WelcomeScreen from './components/WelcomeScreen';
import GameBoard from './components/GameBoard';
import Leaderboard from './components/Leaderboard';
import UserStats from './components/UserStats';
import ErrorBoundary from './components/ErrorBoundary';
import { Users, Trophy, BarChart3, Gamepad2 } from 'lucide-react';
import NewGameModal from './components/NewGameModal';

function App() {
  const [gameState, setGameState] = useState('welcome');
  const [username, setUsername] = useState('');
  const [currentGame, setCurrentGame] = useState(null);
  const [playerNumber, setPlayerNumber] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [leaderboard, setLeaderboard] = useState([]);
  const [userStats, setUserStats] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const [showNewGameModal, setShowNewGameModal] = useState(false);
  const connectionTimeoutRef = useRef(null);
  const [waitingMode, setWaitingMode] = useState(null); // 'bot' | 'player' | null

  useEffect(() => {
    try {
      socketService.connect();
    } catch (error) {
      console.error('Failed to connect to socket server:', error);
      toast.error('Failed to connect to game server');
      setConnectionStatus('disconnected');
    }

    socketService.on('connect', () => {
      setConnectionStatus('connected');
      toast.success('Connected to game server!');
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
        connectionTimeoutRef.current = null;
      }
    });

    socketService.on('disconnect', () => {
      setConnectionStatus('disconnected');
      setIsLoading(false);
      toast.error('Disconnected from server');
    });

    if (socketService.socket) {
      socketService.socket.on('reconnect_attempt', () => {
        setConnectionStatus('reconnecting');
        toast.info('Reconnecting to server...');
      });
      socketService.socket.on('reconnect_failed', () => {
        setConnectionStatus('disconnected');
        toast.error('Reconnection failed. Please check your connection and retry.');
      });
    }

    socketService.onWaitingForOpponent((data) => {
      setGameState('waiting');
      setIsLoading(false);
      setWaitingMode('player');
      toast.info('Waiting for opponent... Bot will join in 10 seconds if no player found.');
    });

    socketService.onGameStarted((data) => {
      setCurrentGame(data);
      setGameState('playing');
      setIsLoading(false);
      setWaitingMode(null);
      if (username && data.player1 && data.player2) {
        if (username === data.player1) setPlayerNumber(1);
        else if (username === data.player2) setPlayerNumber(2);
        else setPlayerNumber(null);
      }
    });

    socketService.onPlayerNumber((data) => {
      setPlayerNumber(data.playerNumber);
    });

    socketService.onGameUpdate((data) => {
      setCurrentGame(data);
      setGameState('playing');
      if (username && data.player1 && data.player2) {
        if (username === data.player1) setPlayerNumber(1);
        else if (username === data.player2) setPlayerNumber(2);
        else setPlayerNumber(null);
      }
      if (data.gameStatus === 'won') {
        const winner = (data.winner || '').toLowerCase();
        const myName = (username || '').toLowerCase();
        if (
          winner === myName ||
          (playerNumber && ((winner === (data.player1 || '').toLowerCase() && playerNumber === 1) || (winner === (data.player2 || '').toLowerCase() && playerNumber === 2)))
        ) {
          toast.success('🎉 You won!');
        } else if (winner === 'bot' && myName !== 'bot') {
          toast.info('🤖 Bot wins! Better luck next time!');
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
      if (
        error.message === 'Username already in use' &&
        (gameState === 'playing' || gameState === 'waiting')
      ) {
        return;
      }
      toast.error(error.message || 'An error occurred');
    });

    if (connectionTimeoutRef.current) {
      clearTimeout(connectionTimeoutRef.current);
    }
    connectionTimeoutRef.current = setTimeout(() => {
      if (connectionStatus === 'connecting') {
        setConnectionStatus('disconnected');
        toast.error('Connection timeout. Please check if the server is running.');
      }
    }, 10000);

    return () => {
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
        connectionTimeoutRef.current = null;
      }
      if (socketService.socket) {
        socketService.socket.off('reconnect_attempt');
        socketService.socket.off('reconnect_failed');
      }
    };
  }, [retryKey]);

  useEffect(() => {
    return () => {
      socketService.disconnect();
    };
  }, []);

  const handleJoinGame = (enteredUsername) => {
    if (!enteredUsername.trim()) {
      toast.error('Please enter a username');
      return;
    }
    if (connectionStatus !== 'connected') {
      toast.error('Not connected to server. Please wait.');
      return;
    }
    setIsLoading(true);
    setUsername(enteredUsername.trim().toLowerCase());
    try {
      socketService.joinGame(enteredUsername.trim().toLowerCase());
    } catch (error) {
      console.error('Failed to join game:', error);
      toast.error('Failed to join game. Please try again.');
      setIsLoading(false);
    }
  };

  const handleMakeMove = (column) => {
    console.log('[App] handleMakeMove', { currentGame, playerNumber, column });
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

  const handleRetryConnect = () => {
    setConnectionStatus('connecting');
    setRetryKey(prev => prev + 1);
  };

  const handleRequestNewGame = () => {
    setShowNewGameModal(true);
  };

  const handleCloseNewGameModal = () => {
    setShowNewGameModal(false);
  };

  const handlePlayWithBot = () => {
    setShowNewGameModal(false);
    setIsLoading(true);
    setWaitingMode('bot');
    socketService.joinGame(username || 'Player', true);
  };

  const handlePlayWithPlayer = () => {
    setShowNewGameModal(false);
    setGameState('waiting');
    setIsLoading(true);
    setWaitingMode('player');
    socketService.joinGame(username || 'Player');
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
            onRetryConnect={handleRetryConnect}
          />
        );
      case 'waiting':
        if (waitingMode === 'bot') {
          return null;
        } else {
          return (
            <div className="flex flex-col items-center justify-center min-h-screen p-4 sm:p-8">
              <div className="bg-white rounded-xl shadow-2xl p-6 sm:p-8 max-w-md w-full text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-6"></div>
                <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4">Finding Opponent...</h2>
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
        }
      case 'playing':
        return (
          <>
            <GameBoard
              game={currentGame}
              username={username}
              playerNumber={playerNumber}
              onMakeMove={handleMakeMove}
              onRequestNewGame={handleRequestNewGame}
              onShowStats={handleShowStats}
            />
            <NewGameModal
              isOpen={showNewGameModal}
              onClose={handleCloseNewGameModal}
              onPlayWithBot={handlePlayWithBot}
              onPlayWithPlayer={handlePlayWithPlayer}
            />
          </>
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
    <ErrorBoundary>
      <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 font-inter">
        <header className="bg-white/10 backdrop-blur-md border-b border-white/20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row justify-between items-center py-4">
              <div className="flex items-center space-x-2 mb-4 sm:mb-0">
                <Gamepad2 className="h-8 w-8 text-white" />
                <h1 className="text-2xl font-bold text-white">4-in-a-Row</h1>
              </div>
              {gameState !== 'welcome' && (
                <div className="flex items-center space-x-4">
                  <button
                    onClick={handleShowLeaderboard}
                    className="flex items-center space-x-2 px-3 py-2 bg-white/20 text-white rounded-lg hover:bg-white/30 transition-colors"
                    disabled={gameState === 'leaderboard'}
                    aria-label="View Leaderboard"
                  >
                    <Trophy className="h-4 w-4" />
                    <span>Leaderboard</span>
                  </button>
                  {username && (
                    <button
                      onClick={handleShowStats}
                      className="flex items-center space-x-2 px-3 py-2 bg-white/20 text-white rounded-lg hover:bg-white/30 transition-colors"
                      disabled={gameState === 'stats'}
                      aria-label="View My Stats"
                    >
                      <BarChart3 className="h-4 w-4" />
                      <span>My Stats</span>
                    </button>
                  )}
                  <div className="flex items-center space-x-2 text-white">
                    <div className={`w-2 h-2 rounded-full ${connectionStatus === 'connected' ? 'bg-green-400' : connectionStatus === 'reconnecting' ? 'bg-yellow-400' : 'bg-red-400'}`} />
                    <span className="text-sm">{connectionStatus}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>
        <main>
          {renderCurrentScreen()}
        </main>
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
    </ErrorBoundary>
  );
}

export default App;