export const ROWS = 6
export const COLUMNS = 7

export type Player = 'human' | 'cpu'
export type Cell = Player | null
export type Board = Cell[][]

export function createBoard(): Board {
  return Array.from({ length: ROWS }, () => Array<Cell>(COLUMNS).fill(null))
}

export function dropDisc(board: Board, column: number, player: Player): Board | null {
  if (column < 0 || column >= COLUMNS) return null
  const row = [...board].reverse().findIndex((line) => line[column] === null)
  if (row < 0) return null

  const next = board.map((line) => [...line])
  next[ROWS - 1 - row][column] = player
  return next
}

export function getWinningCells(board: Board, player: Player): [number, number][] {
  const directions: [number, number][] = [
    [0, 1],
    [1, 0],
    [1, 1],
    [1, -1],
  ]

  for (let row = 0; row < ROWS; row += 1) {
    for (let column = 0; column < COLUMNS; column += 1) {
      if (board[row][column] !== player) continue
      for (const [rowStep, columnStep] of directions) {
        const cells: [number, number][] = []
        for (let step = 0; step < 4; step += 1) {
          const nextRow = row + rowStep * step
          const nextColumn = column + columnStep * step
          if (
            nextRow < 0 || nextRow >= ROWS ||
            nextColumn < 0 || nextColumn >= COLUMNS ||
            board[nextRow][nextColumn] !== player
          ) break
          cells.push([nextRow, nextColumn])
        }
        if (cells.length === 4) return cells
      }
    }
  }
  return []
}

export function isDraw(board: Board): boolean {
  return board.every((row) => row.every((cell) => cell !== null)) &&
    !getWinningCells(board, 'human').length && !getWinningCells(board, 'cpu').length
}

export function getLegalMoves(board: Board): number[] {
  return Array.from({ length: COLUMNS }, (_, column) => column).filter((column) => board[0][column] === null)
}

function scorePosition(board: Board, player: Player): number {
  const opponent: Player = player === 'cpu' ? 'human' : 'cpu'
  let score = 0
  const windows: Cell[][] = []
  const directions: [number, number][] = [[0, 1], [1, 0], [1, 1], [1, -1]]

  for (let row = 0; row < ROWS; row += 1) {
    for (let column = 0; column < COLUMNS; column += 1) {
      for (const [rowStep, columnStep] of directions) {
        const endRow = row + rowStep * 3
        const endColumn = column + columnStep * 3
        if (endRow < ROWS && endColumn >= 0 && endColumn < COLUMNS) {
          windows.push(Array.from({ length: 4 }, (_, step) => board[row + rowStep * step][column + columnStep * step]))
        }
      }
    }
  }

  for (const window of windows) {
    const own = window.filter((cell) => cell === player).length
    const other = window.filter((cell) => cell === opponent).length
    if (!other) score += own === 3 ? 90 : own === 2 ? 12 : own === 1 ? 2 : 0
    if (!own) score -= other === 3 ? 110 : other === 2 ? 14 : 0
  }
  for (let row = 0; row < ROWS; row += 1) {
    if (board[row][Math.floor(COLUMNS / 2)] === player) score += 5
  }
  return score
}

function minimax(board: Board, depth: number, maximizing: boolean, alpha: number, beta: number): number {
  if (getWinningCells(board, 'cpu').length) return 100_000 + depth
  if (getWinningCells(board, 'human').length) return -100_000 - depth
  const moves = getLegalMoves(board)
  if (!depth || !moves.length) return scorePosition(board, 'cpu')

  if (maximizing) {
    let value = -Infinity
    for (const column of moves) {
      const next = dropDisc(board, column, 'cpu')!
      value = Math.max(value, minimax(next, depth - 1, false, alpha, beta))
      alpha = Math.max(alpha, value)
      if (alpha >= beta) break
    }
    return value
  }

  let value = Infinity
  for (const column of moves) {
    const next = dropDisc(board, column, 'human')!
    value = Math.min(value, minimax(next, depth - 1, true, alpha, beta))
    beta = Math.min(beta, value)
    if (alpha >= beta) break
  }
  return value
}

export function chooseCpuMove(board: Board): number | null {
  const moves = getLegalMoves(board)
  if (!moves.length) return null
  const ordered = [...moves].sort((a, b) => Math.abs(3 - a) - Math.abs(3 - b))
  for (const column of ordered) {
    if (getWinningCells(dropDisc(board, column, 'cpu')!, 'cpu').length) return column
  }
  for (const column of ordered) {
    if (getWinningCells(dropDisc(board, column, 'human')!, 'human').length) return column
  }

  let bestMove = ordered[0]
  let bestScore = -Infinity
  for (const column of ordered) {
    const next = dropDisc(board, column, 'cpu')!
    const score = minimax(next, 4, false, -Infinity, Infinity)
    if (score > bestScore) {
      bestScore = score
      bestMove = column
    }
  }
  return bestMove
}
