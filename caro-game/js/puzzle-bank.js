// puzzle-bank.js — curated daily puzzles (5 starter, expand to 30)
// Coordinates are 0-based. Visual focus around center (row 8-14) for mobile clarity.

export const PUZZLES = [
  {
    id: 1,
    goal: 'win-in-1',
    player: 'X',
    maxMoves: 3,
    initial: [
      { row: 10, col: 8, player: 'X' },
      { row: 10, col: 9, player: 'X' },
      { row: 10, col: 10, player: 'X' },
      { row: 10, col: 11, player: 'X' },
      { row: 10, col: 7, player: 'O' },
    ],
    solution: [{ row: 10, col: 12 }],
    hint: 'Hoàn thành hàng ngang',
  },
  {
    id: 2,
    goal: 'win-in-1',
    player: 'X',
    maxMoves: 3,
    initial: [
      { row: 8, col: 8, player: 'X' },
      { row: 9, col: 9, player: 'X' },
      { row: 10, col: 10, player: 'X' },
      { row: 11, col: 11, player: 'X' },
      { row: 12, col: 12, player: 'O' },
    ],
    solution: [{ row: 7, col: 7 }],
    hint: 'Đi theo đường chéo chính',
  },
  {
    id: 3,
    goal: 'win-in-2',
    player: 'X',
    maxMoves: 4,
    initial: [
      { row: 10, col: 7, player: 'X' },
      { row: 10, col: 8, player: 'X' },
      { row: 10, col: 9, player: 'X' },
      { row: 8, col: 10, player: 'X' },
      { row: 9, col: 10, player: 'X' },
      { row: 11, col: 10, player: 'X' },
      { row: 10, col: 6, player: 'O' },
      { row: 7, col: 10, player: 'O' },
    ],
    solution: [{ row: 10, col: 10 }, { row: 12, col: 10 }],
    scriptedResponses: [
      { row: 10, col: 11 }, // AI blocks the horizontal threat
    ],
    hint: 'Tạo fork (hai mối đe dọa)',
  },
  {
    id: 4,
    goal: 'win-in-2',
    player: 'X',
    maxMoves: 4,
    initial: [
      { row: 10, col: 7, player: 'X' },
      { row: 10, col: 8, player: 'X' },
      { row: 10, col: 9, player: 'X' },
      { row: 7, col: 10, player: 'X' },
      { row: 8, col: 10, player: 'X' },
      { row: 9, col: 10, player: 'X' },
      { row: 10, col: 6, player: 'O' },
      { row: 6, col: 10, player: 'O' },
    ],
    solution: [{ row: 10, col: 10 }, { row: 11, col: 10 }],
    hint: 'Tìm điểm giao của hai hàng',
  },
  {
    id: 5,
    goal: 'block-in-2',
    player: 'X',
    maxMoves: 2,
    initial: [
      // Threat 1 — immediate win if not blocked (only one open end)
      { row: 10, col: 8, player: 'O' },
      { row: 10, col: 9, player: 'O' },
      { row: 10, col: 10, player: 'O' },
      { row: 10, col: 11, player: 'O' },
      { row: 10, col: 7, player: 'X' },
      // Threat 2 — needs AI setup; one side already blocked
      { row: 12, col: 8, player: 'O' },
      { row: 12, col: 9, player: 'O' },
      { row: 12, col: 10, player: 'O' },
      { row: 12, col: 11, player: 'X' },
      // Neutral stone
      { row: 11, col: 15, player: 'X' },
    ],
    solution: [
      { row: 10, col: 12 }, // Block threat 1
      { row: 12, col: 6 },  // Block threat 2 after AI expands it
    ],
    hint: 'Chặn đòn tấn công của đối phương',
  },
];
