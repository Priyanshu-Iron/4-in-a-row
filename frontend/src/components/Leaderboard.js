import React from 'react';
import { Trophy, Medal, Award, ArrowLeft, TrendingUp } from 'lucide-react';

const Leaderboard = ({ leaderboard, onBack }) => {
  const getRankIcon = (rank) => {
    if (rank === 1) return <Trophy className="h-6 w-6 text-yellow-500" />;
    if (rank === 2) return <Medal className="h-6 w-6 text-gray-400" />;
    if (rank === 3) return <Award className="h-6 w-6 text-orange-500" />;
    return <span className="text-lg font-bold text-gray-500">#{rank}</span>;
  };

  const getRankBadge = (rank) => {
    if (rank === 1) return 'bg-gradient-to-r from-yellow-400 to-yellow-600 text-white';
    if (rank === 2) return 'bg-gradient-to-r from-gray-300 to-gray-500 text-white';
    if (rank === 3) return 'bg-gradient-to-r from-orange-400 to-orange-600 text-white';
    return 'bg-gray-100 text-gray-800';
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
                <h1 className="text-3xl font-bold text-gray-800">Leaderboard</h1>
                <p className="text-gray-600">Top players ranked by wins</p>
              </div>
            </div>
            <Trophy className="h-12 w-12 text-yellow-500" />
          </div>
        </div>

        {/* Leaderboard */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          {leaderboard.length === 0 ? (
            <div className="p-8 text-center">
              <Trophy className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-600 mb-2">No players yet</h3>
              <p className="text-gray-500">Be the first to play and claim the top spot!</p>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                <div className="grid grid-cols-7 gap-4 text-sm font-medium text-gray-700">
                  <div className="col-span-3">Player</div>
                  <div className="text-center">Games</div>
                  <div className="text-center">Wins</div>
                  <div className="text-center">Win Rate</div>
                  <div className="text-center">Rank</div>
                </div>
              </div>

              {/* Player List */}
              <div className="divide-y divide-gray-200">
                {leaderboard.map((player, index) => {
                  const rank = index + 1;
                  const winRate = player.win_percentage || 0;
                  
                  return (
                    <div
                      key={player.username}
                      className={`px-6 py-4 hover:bg-gray-50 transition-colors ${
                        rank <= 3 ? 'bg-gradient-to-r from-blue-50 to-purple-50' : ''
                      }`}
                    >
                      <div className="grid grid-cols-7 gap-4 items-center">
                        {/* Player Name */}
                        <div className="col-span-3 flex items-center space-x-3">
                          <div className="flex-shrink-0">
                            {getRankIcon(rank)}
                          </div>
                          <div>
                            <div className="font-semibold text-gray-800">
                              {player.username}
                            </div>
                            {rank <= 3 && (
                              <div className="text-xs text-gray-500">
                                {rank === 1 ? 'Champion' : rank === 2 ? 'Runner-up' : 'Third Place'}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Games Played */}
                        <div className="text-center">
                          <div className="font-medium text-gray-800">
                            {player.games_played}
                          </div>
                        </div>

                        {/* Wins */}
                        <div className="text-center">
                          <div className="font-semibold text-green-600">
                            {player.games_won}
                          </div>
                        </div>

                        {/* Win Rate */}
                        <div className="text-center">
                          <div className="flex items-center justify-center space-x-1">
                            <span className="font-medium text-gray-800">
                              {winRate}%
                            </span>
                            {winRate >= 70 && <TrendingUp className="h-3 w-3 text-green-500" />}
                          </div>
                        </div>

                        {/* Rank Badge */}
                        <div className="text-center">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getRankBadge(rank)}`}>
                            #{rank}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Stats Summary */}
        {leaderboard.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg p-6 mt-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Summary</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-indigo-600">
                  {leaderboard.length}
                </div>
                <div className="text-sm text-gray-600">Total Players</div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {leaderboard.reduce((sum, player) => sum + player.games_played, 0)}
                </div>
                <div className="text-sm text-gray-600">Total Games</div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">
                  {leaderboard[0]?.username || 'N/A'}
                </div>
                <div className="text-sm text-gray-600">Current Champion</div>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center mt-6 text-white/80">
          <p className="text-sm">
            Rankings are updated in real-time based on games won. 
            Play more games to improve your position!
          </p>
        </div>
      </div>
    </div>
  );
};

export default Leaderboard; 