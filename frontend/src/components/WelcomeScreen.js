import React, { useState } from 'react';
import { Play, Trophy, Users, Gamepad2 } from 'lucide-react';

const WelcomeScreen = ({ onJoinGame, onShowLeaderboard, connectionStatus, isLoading, onRetryConnect }) => {
  const [username, setUsername] = useState('');

  const isConnecting = connectionStatus === 'connecting';
  const isReconnecting = connectionStatus === 'reconnecting';
  const isDisconnected = connectionStatus === 'disconnected';

  const handleSubmit = (e) => {
    e.preventDefault();
    if (username.trim()) {
      onJoinGame(username.trim());
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8 relative">
      {/* Overlay spinner when connecting or reconnecting */}
      {(isConnecting || isReconnecting) && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-white bg-opacity-80">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-indigo-600 mb-4"></div>
            <span className="text-lg font-semibold text-indigo-700">
              {isConnecting ? 'Connecting to server...' : 'Reconnecting to server...'}
            </span>
          </div>
        </div>
      )}
      {/* Retry button overlay if disconnected */}
      {isDisconnected && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-white bg-opacity-90">
          <div className="mb-4 text-lg font-semibold text-red-700">Disconnected from server</div>
          <button
            onClick={onRetryConnect}
            className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-bold text-lg hover:bg-indigo-700 transition-colors shadow-lg"
          >
            Retry Connection
          </button>
        </div>
      )}
      <div className={`bg-white rounded-xl shadow-2xl p-8 max-w-md w-full ${(isConnecting || isReconnecting || isDisconnected) ? 'opacity-50 pointer-events-none' : ''}`}>
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="bg-indigo-100 p-4 rounded-full">
              <Gamepad2 className="h-12 w-12 text-indigo-600" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">4-in-a-Row</h1>
          <p className="text-gray-600">Connect four discs in a row to win!</p>
        </div>

        {/* Connection Status */}
        <div className={`flex items-center justify-center space-x-2 mb-6 p-3 rounded-lg ${
          connectionStatus === 'connected' 
            ? 'bg-green-100 text-green-800' 
            : connectionStatus === 'connecting'
            ? 'bg-yellow-100 text-yellow-800'
            : 'bg-red-100 text-red-800'
        }`}>
          <div className={`w-2 h-2 rounded-full ${
            connectionStatus === 'connected' ? 'bg-green-500' : 
            connectionStatus === 'connecting' ? 'bg-yellow-500' : 'bg-red-500'
          }`} />
          <span className="text-sm font-medium">
            {connectionStatus === 'connected' ? 'Connected to server' : 
             connectionStatus === 'connecting' ? 'Connecting to server...' : 
             'Disconnected from server'}
          </span>
        </div>

        {/* Username Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
              Enter your username
            </label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Your username"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
              maxLength={20}
              disabled={connectionStatus !== 'connected'}
            />
            <p className="text-xs text-gray-500 mt-1">
              Maximum 20 characters. You'll be matched with another player or a bot.
            </p>
          </div>

          <button
            type="submit"
            disabled={!username.trim() || connectionStatus !== 'connected' || isLoading}
            className="w-full flex items-center justify-center space-x-2 bg-indigo-600 text-white py-3 px-4 rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>Joining...</span>
              </>
            ) : (
              <>
                <Play className="h-5 w-5" />
                <span>Join Game</span>
              </>
            )}
          </button>
        </form>

        {/* Game Info */}
        <div className="mt-8 space-y-4">
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">How to Play</h3>
            <ul className="text-sm text-gray-600 space-y-2">
              <li className="flex items-start space-x-2">
                <span className="text-indigo-600 font-bold">•</span>
                <span>Drop discs into columns by clicking</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-indigo-600 font-bold">•</span>
                <span>Connect 4 discs vertically, horizontally, or diagonally to win</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-indigo-600 font-bold">•</span>
                <span>If no opponent joins within 10 seconds, you'll play against our smart bot</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-indigo-600 font-bold">•</span>
                <span>You can reconnect within 30 seconds if disconnected</span>
              </li>
            </ul>
          </div>

          <button
            onClick={onShowLeaderboard}
            className="w-full flex items-center justify-center space-x-2 bg-gray-100 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-200 transition-colors font-medium"
          >
            <Trophy className="h-5 w-5" />
            <span>View Leaderboard</span>
          </button>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center text-xs text-gray-500">
          Real-time multiplayer with competitive AI
        </div>
      </div>
    </div>
  );
};

export default WelcomeScreen; 