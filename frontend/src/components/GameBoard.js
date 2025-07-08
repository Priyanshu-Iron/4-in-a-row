import React, { useRef, useEffect, useState } from 'react';
import { RotateCcw, BarChart3, User, Bot } from 'lucide-react';
import confetti from 'canvas-confetti';

const AVATAR_COLORS = ['bg-red-600', 'bg-black', 'bg-gray-400'];
function getAvatar(name, idx) {
  if (!name) name = idx === 1 ? 'Bot' : 'Player';
  const color = AVATAR_COLORS[idx % AVATAR_COLORS.length];
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div className={`flex items-center justify-center h-10 w-10 rounded-full text-lg font-bold text-white ${color}`}>{initials}</div>
  );
}

const GameBoard = ({ game, username, playerNumber, onMakeMove, onRequestNewGame, onShowStats }) => {
  const [dropAnim, setDropAnim] = useState({});
  const boardRef = useRef(null);
  const prevBoard = useRef(game ? JSON.stringify(game.board) : '');

  useEffect(() => {
    if (!game) return;
    const prev = JSON.parse(prevBoard.current || '[]');
    const curr = game.board;
    let newAnim = {};
    for (let r = 0; r < curr.length; r++) {
      for (let c = 0; c < curr[r].length; c++) {
        if (prev[r] && prev[r][c] !== curr[r][c] && curr[r][c] !== 0) {
          newAnim[`${r}-${c}`] = true;
        }
      }
    }
    setDropAnim(newAnim);
    prevBoard.current = JSON.stringify(curr);
  }, [game]);

  useEffect(() => {
    if (game && game.gameStatus === 'won' && game.winner === username) {
      confetti({ particleCount: 120, spread: 90, origin: { y: 0.6 } });
    }
  }, [game, username]);

  const getPlayerColor = (player) => {
    if (player === 1) return 'bg-red-600';
    if (player === 2) return 'bg-black';
    return 'bg-gray-200';
  };

  const getCellClasses = (row, col, cellValue) => {
    const baseClasses = 'w-14 h-14 rounded-full border-2 border-gray-300 game-cell transition-all duration-300';
    if (cellValue === 0) {
      return `${baseClasses} bg-white hover:bg-gray-100`;
    }
    const isWinningCell = game?.winningCells?.some(([winRow, winCol]) => winRow === row && winCol === col);
    const colorClass = getPlayerColor(cellValue);
    const glowClass = isWinningCell ? 'ring-4 ring-red-400 animate-pulse' : '';
    const dropClass = dropAnim[`${row}-${col}`] ? 'animate-drop' : '';
    return `${baseClasses} ${colorClass} ${glowClass} ${dropClass}`;
  };

  const handleColumnClick = (col) => {
    if (!game) return;
    const { board, currentPlayer, gameStatus } = game;
    console.log('[GameBoard] handleColumnClick', { col, playerNumber, currentPlayer, gameStatus, topCell: board[0][col] });
    const isMyTurn = currentPlayer === playerNumber && gameStatus === 'active';
    const isGameOver = gameStatus !== 'active';
    if (isMyTurn && !isGameOver && board[0][col] === 0) {
      onMakeMove(col);
    }
  };

  const getGameStatusMessage = () => {
    if (!game) return { message: '', className: '' };
    const { gameStatus, winner } = game;
    if (gameStatus === 'won') {
      if (winner === username) {
        return { message: 'You Won!', className: 'text-red-600 font-bold' };
      } else {
        return { message: 'You Lost', className: 'text-black font-bold' };
      }
    }
    if (gameStatus === 'draw') {
      return { message: 'Draw!', className: 'text-gray-700 font-bold' };
    }
    if (gameStatus === 'forfeited') {
      return { message: 'Game Forfeited', className: 'text-yellow-600 font-bold' };
    }
    if (game.currentPlayer === playerNumber) {
      return { message: 'Your Turn', className: 'text-red-600 font-bold' };
    } else {
      const opponent = playerNumber === 1 ? (game.player2 || 'Bot') : (game.player1 || 'Player');
      return { message: `${opponent}'s Turn`, className: 'text-black font-bold' };
    }
  };

  const statusInfo = getGameStatusMessage();
  const board = game?.board || Array(6).fill().map(() => Array(7).fill(0));
  const isGameOver = game?.gameStatus && game.gameStatus !== 'active';

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white">
      <div className="w-full max-w-2xl mx-auto flex flex-col items-center">
        {/* Header */}
        <div className="w-full flex flex-col items-center mb-6">
          <div className="flex items-center space-x-6 mb-2">
            {getAvatar(game?.player1, 0)}
            <span className="text-xl font-bold text-black">{game?.player1}</span>
            <span className="text-lg font-bold text-gray-400">vs</span>
            <span className="text-xl font-bold text-black">{game?.player2}</span>
            {getAvatar(game?.player2, 1)}
          </div>
          <div className={`text-lg px-4 py-2 rounded font-semibold ${statusInfo.className}`}>{statusInfo.message}</div>
          <div className="text-sm text-gray-500 mt-1">Move {game?.moveCount ?? 0}</div>
        </div>
        {/* Board */}
        <div className="bg-white border-2 border-black rounded-xl shadow p-4 flex flex-col items-center mb-6">
          <div className="grid grid-cols-7 gap-2 mb-2">
            {Array.from({ length: 7 }, (_, col) => (
              <button
                key={`header-${col}`}
                onClick={() => handleColumnClick(col)}
                disabled={!game || isGameOver || game.board[0][col] !== 0}
                className={`h-8 w-14 rounded bg-gray-100 border border-gray-300 text-black font-bold focus:outline-none focus:ring-2 focus:ring-red-500 ${!game || isGameOver || game.board[0][col] !== 0 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-red-100 cursor-pointer'}`}
                aria-label={`Drop disc in column ${col + 1}`}
              >
                ↓
              </button>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-2">
            {board.map((row, rowIndex) =>
              row.map((cell, colIndex) => (
                <div
                  key={`${rowIndex}-${colIndex}`}
                  className={getCellClasses(rowIndex, colIndex, cell)}
                  tabIndex={0}
                  aria-label={`Row ${rowIndex + 1}, Column ${colIndex + 1}, ${cell === 0 ? 'empty' : cell === 1 ? game?.player1 : game?.player2}`}
                />
              ))
            )}
          </div>
        </div>
        {/* Controls */}
        <div className="w-full flex flex-row justify-between items-center mb-4">
          <div className="text-xs text-gray-400">Game ID: <span className="font-mono">{game?.gameId?.slice(-8)}</span></div>
          <div className="flex space-x-2">
            <button
              onClick={onShowStats}
              className="flex items-center space-x-2 px-3 py-2 bg-black text-white rounded hover:bg-gray-800 text-sm font-semibold"
            >
              <BarChart3 className="h-4 w-4" />
              <span>Stats</span>
            </button>
            <button
              onClick={onRequestNewGame}
              className="flex items-center space-x-2 px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm font-semibold"
            >
              <RotateCcw className="h-4 w-4" />
              <span>New Game</span>
            </button>
          </div>
        </div>
        {/* Game Over Info */}
        {isGameOver && (
          <div className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-center mt-2">
            <h3 className="text-lg font-bold text-black mb-2">Game Over!</h3>
            <div className="text-sm text-gray-700 space-y-1">
              <p><strong>Final Result:</strong> {game?.gameStatus === 'won' ? `${game?.winner} wins!` : game?.gameStatus === 'draw' ? 'Draw - board is full' : 'Game was forfeited'}</p>
              <p><strong>Total Moves:</strong> {game?.moveCount ?? 0}</p>
              <p><strong>Your Performance:</strong> {game?.gameStatus === 'won' && game?.winner === username ? 'Victory!' : game?.gameStatus === 'won' && game?.winner !== username ? 'Better luck next time!' : game?.gameStatus === 'draw' ? 'Good game!' : 'Game ended early ⚠️'}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GameBoard; 