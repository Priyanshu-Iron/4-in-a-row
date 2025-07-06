import React from 'react';

const NewGameModal = ({ isOpen, onClose, onPlayWithBot, onPlayWithPlayer }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white rounded-xl shadow-2xl p-8 max-w-sm w-full relative">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 text-2xl font-bold"
          aria-label="Close"
        >
          &times;
        </button>
        <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">Start New Game</h2>
        <div className="flex flex-col space-y-4">
          <button
            onClick={onPlayWithBot}
            className="w-full px-4 py-3 bg-indigo-600 text-white rounded-lg font-semibold text-lg hover:bg-indigo-700 transition-colors"
          >
            Play with Bot
          </button>
          <button
            onClick={onPlayWithPlayer}
            className="w-full px-4 py-3 bg-green-600 text-white rounded-lg font-semibold text-lg hover:bg-green-700 transition-colors"
          >
            Play with Player
          </button>
        </div>
      </div>
    </div>
  );
};

export default NewGameModal; 