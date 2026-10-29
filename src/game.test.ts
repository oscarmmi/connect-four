import { describe, expect, it } from 'vitest'
import { chooseCpuMove, createBoard, dropDisc, getWinningCells, isDraw } from './game'

describe('Connect Four game logic', () => {
  it('drops a disc into the lowest empty cell in a column', () => {
    const board = dropDisc(createBoard(), 3, 'human')!
    expect(board[5][3]).toBe('human')
    expect(board[4][3]).toBeNull()
  })

  it('does not mutate the input board and rejects a full column', () => {
    const initial = createBoard()
    const next = dropDisc(initial, 0, 'cpu')!
    expect(initial[5][0]).toBeNull()
    expect(dropDisc(next, 0, 'human')![4][0]).toBe('human')

    let full = initial
    for (let row = 0; row < 6; row += 1) full = dropDisc(full, 0, row % 2 ? 'cpu' : 'human')!
    expect(dropDisc(full, 0, 'human')).toBeNull()
  })

  it.each([
    { name: 'horizontal', moves: [[5, 0], [5, 1], [5, 2], [5, 3]] as [number, number][] },
    { name: 'vertical', moves: [[2, 4], [3, 4], [4, 4], [5, 4]] as [number, number][] },
    { name: 'diagonal', moves: [[2, 3], [3, 4], [4, 5], [5, 6]] as [number, number][] },
  ])('finds a four-disc $name win', ({ moves }) => {
    const board = createBoard()
    for (const [row, column] of moves) board[row][column] = 'human'
    expect(getWinningCells(board, 'human')).toHaveLength(4)
  })

  it('recognizes a full board with no four as a draw', () => {
    const topRow = [0, 0, 1, 1, 0, 0, 1]
    const board = Array.from({ length: 6 }, (_, row) =>
      Array.from({ length: 7 }, (_, column) => (topRow[column] === (row % 2) ? 'human' : 'cpu')),
    )
    expect(board.flat().every(Boolean)).toBe(true)
    expect(getWinningCells(board, 'human')).toHaveLength(0)
    expect(getWinningCells(board, 'cpu')).toHaveLength(0)
    expect(isDraw(board)).toBe(true)
  })

  it('takes a winning move and blocks an immediate human win', () => {
    const cpuCanWin = createBoard()
    for (const column of [1, 2, 3]) cpuCanWin[5][column] = 'cpu'
    expect(chooseCpuMove(cpuCanWin)).toBe(4)

    const mustBlock = createBoard()
    for (const column of [0, 1, 2]) mustBlock[5][column] = 'human'
    expect(chooseCpuMove(mustBlock)).toBe(3)
  })
})
