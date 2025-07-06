const config = require('../config');

class GameLogic {
  constructor() {
    this.width = config.game.boardWidth;
    this.height = config.game.boardHeight;
    this.winCondition = config.game.winCondition;
    this.board = this.createEmptyBoard();
    this.currentPlayer = 1; // 1 for player 1, 2 for player 2
    this.gameStatus = 'active'; // 'active', 'won', 'draw'
    this.winner = null;
    this.winningCells = [];
  }

  createEmptyBoard() {
    return Array(this.height).fill(null).map(() => Array(this.width).fill(0));
  }

  // Make a move in the specified column
  makeMove(column, player) {
    if (!this.isValidMove(column)) {
      return { success: false, message: 'Invalid move' };
    }

    // Find the lowest available row in the column
    for (let row = this.height - 1; row >= 0; row--) {
      if (this.board[row][column] === 0) {
        this.board[row][column] = player;
        
        // Check for win
        if (this.checkWin(row, column, player)) {
          this.gameStatus = 'won';
          this.winner = player;
        } else if (this.isBoardFull()) {
          this.gameStatus = 'draw';
        } else {
          this.currentPlayer = player === 1 ? 2 : 1;
        }

        return {
          success: true,
          row,
          column,
          player,
          gameStatus: this.gameStatus,
          winner: this.winner,
          winningCells: this.winningCells,
          nextPlayer: this.currentPlayer
        };
      }
    }

    return { success: false, message: 'Column is full' };
  }

  isValidMove(column) {
    if (column < 0 || column >= this.width) {
      return false;
    }
    if (this.gameStatus !== 'active') {
      return false;
    }
    return this.board[0][column] === 0; // Top row must be empty
  }

  isBoardFull() {
    return this.board[0].every(cell => cell !== 0);
  }

  checkWin(row, col, player) {
    // Check all four directions: horizontal, vertical, diagonal
    const directions = [
      [0, 1],   // horizontal
      [1, 0],   // vertical
      [1, 1],   // diagonal down-right
      [1, -1]   // diagonal down-left
    ];

    for (const [deltaRow, deltaCol] of directions) {
      if (this.checkDirection(row, col, deltaRow, deltaCol, player)) {
        return true;
      }
    }

    return false;
  }

  checkDirection(row, col, deltaRow, deltaCol, player) {
    let count = 1; // Count the current piece
    const winningCells = [[row, col]];

    // Check in positive direction
    let currentRow = row + deltaRow;
    let currentCol = col + deltaCol;
    while (
      currentRow >= 0 && currentRow < this.height &&
      currentCol >= 0 && currentCol < this.width &&
      this.board[currentRow][currentCol] === player
    ) {
      count++;
      winningCells.push([currentRow, currentCol]);
      currentRow += deltaRow;
      currentCol += deltaCol;
    }

    // Check in negative direction
    currentRow = row - deltaRow;
    currentCol = col - deltaCol;
    while (
      currentRow >= 0 && currentRow < this.height &&
      currentCol >= 0 && currentCol < this.width &&
      this.board[currentRow][currentCol] === player
    ) {
      count++;
      winningCells.unshift([currentRow, currentCol]);
      currentRow -= deltaRow;
      currentCol -= deltaCol;
    }

    if (count >= this.winCondition) {
      this.winningCells = winningCells;
      return true;
    }

    return false;
  }

  // Get valid moves for AI
  getValidMoves() {
    const validMoves = [];
    for (let col = 0; col < this.width; col++) {
      if (this.isValidMove(col)) {
        validMoves.push(col);
      }
    }
    return validMoves;
  }

  // Simulate a move without changing the board state
  simulateMove(column, player) {
    if (!this.isValidMove(column)) {
      return null;
    }

    for (let row = this.height - 1; row >= 0; row--) {
      if (this.board[row][column] === 0) {
        return { row, column, player };
      }
    }
    return null;
  }

  // Create a copy of the current game state
  clone() {
    const clone = new GameLogic();
    clone.board = this.board.map(row => [...row]);
    clone.currentPlayer = this.currentPlayer;
    clone.gameStatus = this.gameStatus;
    clone.winner = this.winner;
    clone.winningCells = [...this.winningCells];
    return clone;
  }

  // Get the board state
  getBoardState() {
    return {
      board: this.board,
      currentPlayer: this.currentPlayer,
      gameStatus: this.gameStatus,
      winner: this.winner,
      winningCells: this.winningCells,
      validMoves: this.getValidMoves()
    };
  }

  // Reset the game
  reset() {
    this.board = this.createEmptyBoard();
    this.currentPlayer = 1;
    this.gameStatus = 'active';
    this.winner = null;
    this.winningCells = [];
  }
}

module.exports = GameLogic; 