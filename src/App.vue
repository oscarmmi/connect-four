<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { chooseCpuMove, createBoard, dropDisc, getWinningCells, isDraw, type Board, type Player } from './game'

type GameResult = Player | 'draw' | null
type RecordBook = { wins: number; losses: number; draws: number }

const STORAGE_KEY = 'connect-four-record-v1'
const board = ref<Board>(createBoard())
const currentPlayer = ref<Player>('human')
const result = ref<GameResult>(null)
const thinking = ref(false)
const hoveredColumn = ref<number | null>(null)
const winningCells = ref<[number, number][]>([])
const record = ref<RecordBook>({ wins: 0, losses: 0, draws: 0 })
let cpuTimer: number | undefined

const filled = computed(() => board.value.flat().filter(Boolean).length)
const statusTitle = computed(() => {
  if (result.value === 'human') return 'A clean win.'
  if (result.value === 'cpu') return 'The machine takes it.'
  if (result.value === 'draw') return 'A perfect stalemate.'
  if (thinking.value) return 'Reading the board…'
  return 'Your move.'
})
const statusCaption = computed(() => {
  if (result.value === 'human') return 'You lined up four. Run it back?'
  if (result.value === 'cpu') return 'Four connected. Ready for another?'
  if (result.value === 'draw') return 'No more moves left. One more round?'
  if (thinking.value) return 'The CPU is looking a few moves ahead.'
  return 'Connect four amber discs to win.'
})
const winningSet = computed(() => new Set(winningCells.value.map(([row, column]) => `${row}-${column}`)))

function saveRecord() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(record.value))
  } catch {
    // The game remains playable when storage is unavailable.
  }
}

function finish(winner: GameResult) {
  result.value = winner
  if (winner === 'human') record.value.wins += 1
  else if (winner === 'cpu') record.value.losses += 1
  else if (winner === 'draw') record.value.draws += 1
  saveRecord()
}

function playColumn(column: number) {
  if (result.value || thinking.value || currentPlayer.value !== 'human') return
  const next = dropDisc(board.value, column, 'human')
  if (!next) return
  board.value = next
  winningCells.value = getWinningCells(next, 'human')
  if (winningCells.value.length) {
    finish('human')
    return
  }
  if (isDraw(next)) {
    finish('draw')
    return
  }

  currentPlayer.value = 'cpu'
  thinking.value = true
  cpuTimer = window.setTimeout(() => {
    const cpuColumn = chooseCpuMove(board.value)
    const afterCpu = cpuColumn === null ? null : dropDisc(board.value, cpuColumn, 'cpu')
    if (afterCpu) {
      board.value = afterCpu
      winningCells.value = getWinningCells(afterCpu, 'cpu')
      if (winningCells.value.length) finish('cpu')
      else if (isDraw(afterCpu)) finish('draw')
    }
    thinking.value = false
    currentPlayer.value = 'human'
  }, 420)
}

function restart() {
  if (cpuTimer !== undefined) window.clearTimeout(cpuTimer)
  board.value = createBoard()
  currentPlayer.value = 'human'
  result.value = null
  thinking.value = false
  hoveredColumn.value = null
  winningCells.value = []
}

function onKeydown(event: KeyboardEvent) {
  if (event.altKey || event.ctrlKey || event.metaKey) return
  const target = event.target as HTMLElement | null
  if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA') return
  if (event.key.toLowerCase() === 'r') {
    restart()
    return
  }
  if (/^[1-7]$/.test(event.key)) playColumn(Number(event.key) - 1)
}

onMounted(() => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored) as Partial<RecordBook>
      record.value = {
        wins: Number.isFinite(parsed.wins) ? Math.max(0, parsed.wins!) : 0,
        losses: Number.isFinite(parsed.losses) ? Math.max(0, parsed.losses!) : 0,
        draws: Number.isFinite(parsed.draws) ? Math.max(0, parsed.draws!) : 0,
      }
    }
  } catch {
    record.value = { wins: 0, losses: 0, draws: 0 }
  }
  window.addEventListener('keydown', onKeydown)
})

onUnmounted(() => {
  if (cpuTimer !== undefined) window.clearTimeout(cpuTimer)
  window.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <main class="page-shell">
    <header class="topbar">
      <a class="wordmark" href="#top" aria-label="Fourplay home">
        <span class="brand-mark" aria-hidden="true"><i></i><i></i><i></i><i></i></span>
        <span>fourplay<span class="brand-period">.</span></span>
      </a>
      <div class="topbar-right">
        <span class="edition-label">THE CLASSIC, RECONNECTED</span>
        <span class="online-indicator"><span></span> CPU ONLINE</span>
      </div>
    </header>

    <section id="top" class="game-layout" aria-label="Connect Four game">
      <div class="intro-column">
        <p class="eyebrow"><span class="eyebrow-line"></span> QUICK THINKING. CLEAN LINES.</p>
        <h1>Four in a row.<br /><em>Make it yours.</em></h1>
        <p class="intro-copy">A little strategy goes a long way. Drop your discs, outthink the CPU, and connect four to take the board.</p>

        <div class="score-panel" aria-label="Your local record">
          <div class="score-heading"><span>YOUR RECORD</span><span class="score-live"><i></i> THIS DEVICE</span></div>
          <div class="score-grid">
            <div class="score-item"><strong>{{ record.wins }}</strong><span>WINS</span></div>
            <div class="score-item"><strong>{{ record.losses }}</strong><span>LOSSES</span></div>
            <div class="score-item"><strong>{{ record.draws }}</strong><span>DRAWS</span></div>
          </div>
        </div>

        <div class="how-to">
          <span class="how-icon" aria-hidden="true">↘</span>
          <p><strong>Make your move</strong><br />Tap a column or press <kbd>1</kbd>–<kbd>7</kbd><br />to drop a disc into place.</p>
        </div>
      </div>

      <section class="play-column" aria-label="Game board and controls">
        <div class="matchbar">
          <div class="player-chip" :class="{ active: currentPlayer === 'human' && !result }">
            <span class="player-dot amber-dot"></span><span>YOU</span><b>01</b>
          </div>
          <div class="match-center"><span>ROUND</span><strong>{{ String(Math.floor(filled / 2) + 1).padStart(2, '0') }}</strong></div>
          <div class="player-chip cpu-chip" :class="{ active: currentPlayer === 'cpu' && !result }">
            <b>CPU</b><span class="player-dot cyan-dot"></span><b>02</b>
          </div>
        </div>

        <div class="status-line" aria-live="polite">
          <span class="status-spark" :class="{ thinking }"></span>
          <div><strong>{{ statusTitle }}</strong><span>{{ statusCaption }}</span></div>
          <button v-if="result" class="inline-restart" @click="restart">PLAY AGAIN <span>↗</span></button>
        </div>

        <div class="board-wrap" :class="{ 'board-finished': result }">
          <div class="column-targets" aria-label="Choose a column">
            <button
              v-for="column in 7"
              :key="column"
              class="column-target"
              :class="{ 'is-hovered': hoveredColumn === column - 1, 'is-disabled': !!result || thinking || board[0][column - 1] !== null }"
              :aria-label="`Drop disc in column ${column}`"
              :disabled="!!result || thinking || board[0][column - 1] !== null"
              @mouseenter="hoveredColumn = column - 1"
              @mouseleave="hoveredColumn = null"
              @focus="hoveredColumn = column - 1"
              @blur="hoveredColumn = null"
              @click="playColumn(column - 1)"
            >
              <span class="column-number">{{ column }}</span>
              <span class="drop-cue" :class="{ 'cue-amber': !thinking && !result }"></span>
            </button>
          </div>
          <div class="board" role="grid" aria-label="Connect Four board, 7 columns by 6 rows">
            <div v-for="(row, rowIndex) in board" :key="rowIndex" class="board-row" role="row">
              <div
                v-for="(cell, columnIndex) in row"
                :key="`${rowIndex}-${columnIndex}`"
                class="cell"
                :class="{
                  'cell-human': cell === 'human',
                  'cell-cpu': cell === 'cpu',
                  'winning-cell': winningSet.has(`${rowIndex}-${columnIndex}`),
                  'preview-cell': hoveredColumn === columnIndex && !cell && !result && !thinking && rowIndex === board.findIndex((line) => line[columnIndex] === null),
                }"
                role="gridcell"
                :aria-label="`Row ${rowIndex + 1}, column ${columnIndex + 1}${cell ? `, ${cell === 'human' ? 'your' : 'CPU'} disc` : ', empty'}`"
              >
                <span v-if="cell" class="disc" :class="cell === 'human' ? 'disc-amber' : 'disc-cyan'"></span>
                <span v-else class="cell-hole"></span>
              </div>
            </div>
          </div>
        </div>

        <footer class="board-footer">
          <span><span class="legend-dot amber-dot"></span> YOUR MOVE <span class="legend-divider">/</span> AMBER</span>
          <button class="reset-button" @click="restart"><span>↻</span> RESTART <kbd>R</kbd></button>
        </footer>
      </section>
    </section>

    <footer class="site-footer">
      <span>GOOD GAMES ARE BUILT ONE MOVE AT A TIME.</span>
      <span>CONNECT FOUR <i>·</i> EST. 1974 <i>·</i> REIMAGINED</span>
    </footer>
  </main>
</template>
