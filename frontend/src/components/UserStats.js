import React from 'react';
import { ArrowLeft, User, TrendingUp, Calendar, Clock, Target } from 'lucide-react';

const UserStats = ({ stats, username, onBack }) => {
  if (!stats) {
    return (
      <div className="min-h-screen p-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-xl shadow-lg p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading stats...</p>
          </div>
        </div>
      </div>
    );
  }

  const { stats: userStats, gameHistory = [] } = stats;
  const {
    games_played = 0,
    games_won = 0,
    games_lost = 0,
    games_drawn = 0
  } = userStats || {};

  const winRate = games_played > 0 ? ((games_won / games_played) * 100).toFixed(1) : 0;
  const lossRate = games_played > 0 ? ((games_lost / games_played) * 100).toFixed(1) : 0;
  const drawRate = games_played > 0 ? ((games_drawn / games_played) * 100).toFixed(1) : 0;

  const getPerformanceLevel = (winRate) => {
    if (winRate >= 80) return { level: 'Expert', color: 'text-purple-600', bg: 'bg-purple-100' };
    if (winRate >= 60) return { level: 'Advanced', color: 'text-blue-600', bg: 'bg-blue-100' };
    if (winRate >= 40) return { level: 'Intermediate', color: 'text-green-600', bg: 'bg-green-100' };
    if (winRate >= 20) return { level: 'Beginner', color: 'text-yellow-600', bg: 'bg-yellow-100' };
    return { level: 'Novice', color: 'text-gray-600', bg: 'bg-gray-100' };
  };

  const performance = getPerformanceLevel(parseFloat(winRate));

  const formatGameResult = (game) => {
    if (game.game_status === 'won') {
      return game.winner === username ? 'Won' : 'Lost';
    }
    return game.game_status === 'draw' ? 'Draw' : 'Forfeited';
  };

  const getResultColor = (game) => {
    if (game.game_status === 'won') {
      return game.winner === username ? 'text-green-600' : 'text-red-600';
    }
    return game.game_status === 'draw' ? 'text-blue-600' : 'text-orange-600';
  };

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <button
                onClick={onBack}
                className="flex items-center space-x-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back</span>
              </button>
              <div>
                <h1 className="text-3xl font-bold text-gray-800">Player Statistics</h1>
                <p className="text-gray-600">Performance overview for {username}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <User className="h-12 w-12 text-indigo-500" />
            </div>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Games Played</p>
                <p className="text-2xl font-bold text-gray-900">{games_played}</p>
              </div>
              <Target className="h-8 w-8 text-indigo-500" />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Games Won</p>
                <p className="text-2xl font-bold text-green-600">{games_won}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Win Rate</p>
                <p className="text-2xl font-bold text-blue-600">{winRate}%</p>
              </div>
              <div className="text-2xl">🎯</div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Performance</p>
                <p className={`text-lg font-bold ${performance.color}`}>{performance.level}</p>
              </div>
              <div className={`p-2 rounded-full ${performance.bg}`}>
                <User className={`h-6 w-6 ${performance.color}`} />
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Stats */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-6">Performance Breakdown</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Win/Loss Chart */}
            <div className="space-y-4">
              <h3 className="font-medium text-gray-700">Game Results</h3>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Wins</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-24 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-500 h-2 rounded-full" 
                        style={{ width: `${games_played > 0 ? (games_won / games_played) * 100 : 0}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium text-green-600">{games_won}</span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Losses</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-24 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-red-500 h-2 rounded-full" 
                        style={{ width: `${games_played > 0 ? (games_lost / games_played) * 100 : 0}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium text-red-600">{games_lost}</span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Draws</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-24 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full" 
                        style={{ width: `${games_played > 0 ? (games_drawn / games_played) * 100 : 0}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium text-blue-600">{games_drawn}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Percentages */}
            <div className="space-y-4">
              <h3 className="font-medium text-gray-700">Percentages</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Win Rate</span>
                  <span className="font-semibold text-green-600">{winRate}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Loss Rate</span>
                  <span className="font-semibold text-red-600">{lossRate}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Draw Rate</span>
                  <span className="font-semibold text-blue-600">{drawRate}%</span>
                </div>
              </div>
            </div>

            {/* Performance Level */}
            <div className="space-y-4">
              <h3 className="font-medium text-gray-700">Performance Level</h3>
              <div className={`p-4 rounded-lg ${performance.bg}`}>
                <div className={`text-lg font-bold ${performance.color} mb-2`}>
                  {performance.level}
                </div>
                <p className="text-sm text-gray-600">
                  {games_played === 0 ? 'Play some games to see your level!' :
                   parseFloat(winRate) >= 60 ? 'Excellent performance! Keep it up!' :
                   parseFloat(winRate) >= 40 ? 'Good progress! Keep improving!' :
                   'Keep practicing to improve your skills!'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Games */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-6">Recent Games</h2>
          
          {gameHistory.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No games played yet</p>
              <p className="text-sm text-gray-400">Your game history will appear here</p>
            </div>
          ) : (
            <div className="space-y-4">
              {gameHistory.map((game, index) => (
                <div key={game.game_id || index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className={`px-3 py-1 rounded-full text-sm font-medium ${getResultColor(game)}`}>
                      {formatGameResult(game)}
                    </div>
                    <div>
                      <p className="font-medium text-gray-800">
                        vs {game.opponent || 'Unknown'}
                      </p>
                      <p className="text-sm text-gray-600">
                        {game.total_moves} moves
                        {game.duration_seconds && ` • ${Math.floor(game.duration_seconds / 60)}:${(game.duration_seconds % 60).toString().padStart(2, '0')}`}
                      </p>
                    </div>
                  </div>
                  <div className="text-sm text-gray-500">
                    {game.completed_at ? new Date(game.completed_at).toLocaleDateString() : 'Recent'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-6 text-white/80">
          <p className="text-sm">
            Keep playing to improve your statistics and climb the leaderboard!
          </p>
        </div>
      </div>
    </div>
  );
};

export default UserStats; 