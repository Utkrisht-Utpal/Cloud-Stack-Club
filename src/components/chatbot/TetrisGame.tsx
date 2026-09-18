import React, { useEffect, useRef, useCallback, useState } from 'react';
import { RotateCcw, Play, Pause, X } from 'lucide-react';

// ─── Constants ────────────────────────────────────────────────────────────────
const COLS = 10;
const ROWS = 20;
const BLOCK = 18; // px per cell

type Color = string;
type Grid = Color[][];

const EMPTY = '';

// Tetromino shapes + colors
const TETROMINOES: { shape: number[][]; color: Color }[] = [
  { shape: [[1, 1, 1, 1]], color: '#22d3ee' },                          // I
  { shape: [[1, 1], [1, 1]], color: '#facc15' },                        // O
  { shape: [[0, 1, 0], [1, 1, 1]], color: '#a855f7' },                  // T
  { shape: [[1, 0, 0], [1, 1, 1]], color: '#3b82f6' },                  // J
  { shape: [[0, 0, 1], [1, 1, 1]], color: '#f97316' },                  // L
  { shape: [[0, 1, 1], [1, 1, 0]], color: '#22c55e' },                  // S
  { shape: [[1, 1, 0], [0, 1, 1]], color: '#ef4444' },                  // Z
];

interface Piece {
  shape: number[][];
  color: Color;
  x: number;
  y: number;
}

const createGrid = (): Grid =>
  Array.from({ length: ROWS }, () => Array(COLS).fill(EMPTY));

const randomPiece = (): Piece => {
  const t = TETROMINOES[Math.floor(Math.random() * TETROMINOES.length)];
  return {
    shape: t.shape,
    color: t.color,
    x: Math.floor(COLS / 2) - Math.floor(t.shape[0].length / 2),
    y: 0,
  };
};

const rotate = (shape: number[][]): number[][] => {
  const rows = shape.length;
  const cols = shape[0].length;
  const result: number[][] = Array.from({ length: cols }, () => Array(rows).fill(0));
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      result[c][rows - 1 - r] = shape[r][c];
    }
  }
  return result;
};

const isValid = (grid: Grid, piece: Piece, dx = 0, dy = 0, shape = piece.shape): boolean => {
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue;
      const nx = piece.x + c + dx;
      const ny = piece.y + r + dy;
      if (nx < 0 || nx >= COLS || ny >= ROWS) return false;
      if (ny >= 0 && grid[ny][nx] !== EMPTY) return false;
    }
  }
  return true;
};

const merge = (grid: Grid, piece: Piece): Grid => {
  const next = grid.map((row) => [...row]);
  for (let r = 0; r < piece.shape.length; r++) {
    for (let c = 0; c < piece.shape[r].length; c++) {
      if (piece.shape[r][c] && piece.y + r >= 0) {
        next[piece.y + r][piece.x + c] = piece.color;
      }
    }
  }
  return next;
};

const clearLines = (grid: Grid): { grid: Grid; lines: number } => {
  const newGrid = grid.filter((row) => row.some((cell) => cell === EMPTY));
  const lines = ROWS - newGrid.length;
  const emptyRows = Array.from({ length: lines }, () => Array(COLS).fill(EMPTY));
  return { grid: [...emptyRows, ...newGrid], lines };
};

// ─── Component ────────────────────────────────────────────────────────────────
interface TetrisGameProps {
  onClose: () => void;
}

export const TetrisGame: React.FC<TetrisGameProps> = ({ onClose }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewRef = useRef<HTMLCanvasElement>(null);

  const gridRef = useRef<Grid>(createGrid());
  const pieceRef = useRef<Piece>(randomPiece());
  const nextPieceRef = useRef<Piece>(randomPiece());
  const scoreRef = useRef(0);
  const linesRef = useRef(0);
  const levelRef = useRef(1);
  const gameOverRef = useRef(false);
  const pausedRef = useRef(false);
  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef(0);
  const dropIntervalRef = useRef(800);

  const [displayScore, setDisplayScore] = useState(0);
  const [displayLines, setDisplayLines] = useState(0);
  const [displayLevel, setDisplayLevel] = useState(1);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [started, setStarted] = useState(false);

  // ── Drawing ────────────────────────────────────────────────────────────────
  const drawGrid = useCallback((ctx: CanvasRenderingContext2D) => {
    ctx.clearRect(0, 0, COLS * BLOCK, ROWS * BLOCK);

    // Background grid lines
    ctx.strokeStyle = 'rgba(148,163,184,0.08)';
    ctx.lineWidth = 0.5;
    for (let r = 0; r <= ROWS; r++) {
      ctx.beginPath();
      ctx.moveTo(0, r * BLOCK);
      ctx.lineTo(COLS * BLOCK, r * BLOCK);
      ctx.stroke();
    }
    for (let c = 0; c <= COLS; c++) {
      ctx.beginPath();
      ctx.moveTo(c * BLOCK, 0);
      ctx.lineTo(c * BLOCK, ROWS * BLOCK);
      ctx.stroke();
    }

    // Placed cells
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const color = gridRef.current[r][c];
        if (color !== EMPTY) {
          drawBlock(ctx, c, r, color);
        }
      }
    }

    // Ghost piece
    const piece = pieceRef.current;
    let ghostY = piece.y;
    while (isValid(gridRef.current, piece, 0, ghostY - piece.y + 1)) ghostY++;
    if (ghostY !== piece.y) {
      for (let r = 0; r < piece.shape.length; r++) {
        for (let c = 0; c < piece.shape[r].length; c++) {
          if (piece.shape[r][c]) {
            const x = (piece.x + c) * BLOCK;
            const y = (ghostY + r) * BLOCK;
            ctx.fillStyle = 'rgba(255,255,255,0.07)';
            ctx.fillRect(x + 1, y + 1, BLOCK - 2, BLOCK - 2);
            ctx.strokeStyle = 'rgba(255,255,255,0.18)';
            ctx.lineWidth = 1;
            ctx.strokeRect(x + 1, y + 1, BLOCK - 2, BLOCK - 2);
          }
        }
      }
    }

    // Active piece
    for (let r = 0; r < piece.shape.length; r++) {
      for (let c = 0; c < piece.shape[r].length; c++) {
        if (piece.shape[r][c]) {
          drawBlock(ctx, piece.x + c, piece.y + r, piece.color);
        }
      }
    }
  }, []);

  const drawBlock = (ctx: CanvasRenderingContext2D, col: number, row: number, color: string) => {
    const x = col * BLOCK;
    const y = row * BLOCK;
    const r = 3;

    // Main fill
    ctx.fillStyle = color;
    roundRect(ctx, x + 1, y + 1, BLOCK - 2, BLOCK - 2, r);
    ctx.fill();

    // Highlight
    ctx.fillStyle = 'rgba(255,255,255,0.28)';
    roundRect(ctx, x + 2, y + 2, BLOCK - 8, 4, 2);
    ctx.fill();

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    roundRect(ctx, x + 2, y + BLOCK - 5, BLOCK - 4, 3, 2);
    ctx.fill();
  };

  const roundRect = (
    ctx: CanvasRenderingContext2D,
    x: number, y: number, w: number, h: number, r: number,
  ) => {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  };

  const drawPreview = useCallback(() => {
    const canvas = previewRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const next = nextPieceRef.current;
    const offsetX = Math.floor((canvas.width / BLOCK - next.shape[0].length) / 2);
    const offsetY = Math.floor((canvas.height / BLOCK - next.shape.length) / 2);

    for (let r = 0; r < next.shape.length; r++) {
      for (let c = 0; c < next.shape[r].length; c++) {
        if (next.shape[r][c]) {
          drawBlock(ctx, offsetX + c, offsetY + r, next.color);
        }
      }
    }
  }, []);

  // ── Game Loop ──────────────────────────────────────────────────────────────
  const tick = useCallback((time: number) => {
    if (gameOverRef.current || pausedRef.current) return;

    const delta = time - lastTimeRef.current;
    if (delta >= dropIntervalRef.current) {
      lastTimeRef.current = time;

      const piece = pieceRef.current;
      if (isValid(gridRef.current, piece, 0, 1)) {
        pieceRef.current = { ...piece, y: piece.y + 1 };
      } else {
        // Lock
        gridRef.current = merge(gridRef.current, piece);
        const { grid: cleared, lines } = clearLines(gridRef.current);
        gridRef.current = cleared;

        linesRef.current += lines;
        const pts = [0, 100, 300, 500, 800][Math.min(lines, 4)] * levelRef.current;
        scoreRef.current += pts;
        levelRef.current = Math.floor(linesRef.current / 10) + 1;
        dropIntervalRef.current = Math.max(100, 800 - (levelRef.current - 1) * 70);

        setDisplayScore(scoreRef.current);
        setDisplayLines(linesRef.current);
        setDisplayLevel(levelRef.current);

        // Spawn next
        const next = nextPieceRef.current;
        pieceRef.current = { ...next, x: Math.floor(COLS / 2) - Math.floor(next.shape[0].length / 2), y: 0 };
        nextPieceRef.current = randomPiece();
        drawPreview();

        // Game over check
        if (!isValid(gridRef.current, pieceRef.current)) {
          gameOverRef.current = true;
          setIsGameOver(true);
          return;
        }
      }
    }

    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) drawGrid(ctx);
    }

    rafRef.current = requestAnimationFrame(tick);
  }, [drawGrid, drawPreview]);

  const startLoop = useCallback(() => {
    lastTimeRef.current = performance.now();
    rafRef.current = requestAnimationFrame(tick);
  }, [tick]);

  // ── Controls ───────────────────────────────────────────────────────────────
  const handleKey = useCallback((e: KeyboardEvent) => {
    if (!started || gameOverRef.current) return;

    // Prevent arrow keys and space from scrolling the page while the game is active
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' '].includes(e.key)) {
      e.preventDefault();
    }

    const piece = pieceRef.current;

    if (e.key === 'ArrowLeft' && isValid(gridRef.current, piece, -1, 0)) {
      pieceRef.current = { ...piece, x: piece.x - 1 };
    } else if (e.key === 'ArrowRight' && isValid(gridRef.current, piece, 1, 0)) {
      pieceRef.current = { ...piece, x: piece.x + 1 };
    } else if (e.key === 'ArrowDown') {
      if (isValid(gridRef.current, piece, 0, 1)) {
        pieceRef.current = { ...piece, y: piece.y + 1 };
        scoreRef.current += 1;
        setDisplayScore(scoreRef.current);
      }
    } else if (e.key === 'ArrowUp' || e.key === 'x' || e.key === 'X') {
      const rotated = rotate(piece.shape);
      if (isValid(gridRef.current, piece, 0, 0, rotated)) {
        pieceRef.current = { ...piece, shape: rotated };
      } else if (isValid(gridRef.current, piece, 1, 0, rotated)) {
        pieceRef.current = { ...piece, shape: rotated, x: piece.x + 1 };
      } else if (isValid(gridRef.current, piece, -1, 0, rotated)) {
        pieceRef.current = { ...piece, shape: rotated, x: piece.x - 1 };
      }
    } else if (e.key === ' ') {
      // Hard drop
      let dropY = piece.y;
      while (isValid(gridRef.current, piece, 0, dropY - piece.y + 1)) dropY++;
      scoreRef.current += (dropY - piece.y) * 2;
      pieceRef.current = { ...piece, y: dropY };
      setDisplayScore(scoreRef.current);
    } else if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
      handlePause();
    }

    // Redraw immediately
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) drawGrid(ctx);
    }
  }, [started, drawGrid]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: handleKey changes with started
  useEffect(() => {
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleKey]);

  const handlePause = () => {
    if (gameOverRef.current) return;
    pausedRef.current = !pausedRef.current;
    setIsPaused(pausedRef.current);
    if (!pausedRef.current) {
      lastTimeRef.current = performance.now();
      rafRef.current = requestAnimationFrame(tick);
    }
  };

  const handleRestart = () => {
    cancelAnimationFrame(rafRef.current);
    gridRef.current = createGrid();
    pieceRef.current = randomPiece();
    nextPieceRef.current = randomPiece();
    scoreRef.current = 0;
    linesRef.current = 0;
    levelRef.current = 1;
    dropIntervalRef.current = 800;
    gameOverRef.current = false;
    pausedRef.current = false;
    setDisplayScore(0);
    setDisplayLines(0);
    setDisplayLevel(1);
    setIsGameOver(false);
    setIsPaused(false);

    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) drawGrid(ctx);
    }
    drawPreview();
    startLoop();
  };

  const handleStart = () => {
    setStarted(true);
    drawPreview();
    startLoop();
  };

  // ── Touch controls ─────────────────────────────────────────────────────────
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!started || gameOverRef.current || pausedRef.current) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    const piece = pieceRef.current;

    if (absDx < 10 && absDy < 10) {
      // Tap → rotate
      const rotated = rotate(piece.shape);
      if (isValid(gridRef.current, piece, 0, 0, rotated)) {
        pieceRef.current = { ...piece, shape: rotated };
      }
    } else if (absDx > absDy) {
      if (dx > 0 && isValid(gridRef.current, piece, 1, 0)) {
        pieceRef.current = { ...piece, x: piece.x + 1 };
      } else if (dx < 0 && isValid(gridRef.current, piece, -1, 0)) {
        pieceRef.current = { ...piece, x: piece.x - 1 };
      }
    } else if (dy > 30) {
      // Swipe down → hard drop
      let dropY = piece.y;
      while (isValid(gridRef.current, piece, 0, dropY - piece.y + 1)) dropY++;
      scoreRef.current += (dropY - piece.y) * 2;
      pieceRef.current = { ...piece, y: dropY };
      setDisplayScore(scoreRef.current);
    }

    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) drawGrid(ctx);
    }
  };

  // ── Initial draw ───────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) drawGrid(ctx);
    }
    drawPreview();
    return () => cancelAnimationFrame(rafRef.current);
  }, [drawGrid, drawPreview]);

  const CANVAS_W = COLS * BLOCK;
  const CANVAS_H = ROWS * BLOCK;
  const PREVIEW_SIZE = 4 * BLOCK;

  return (
    <div
      className="flex flex-col items-center w-full select-none"
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between w-full px-1 mb-2">
        <span className="text-[11px] font-black uppercase tracking-widest text-blue-400">
          🕹️ Tetris
        </span>
        <button
          onClick={onClose}
          className="p-1 rounded-lg hover:bg-slate-700/60 text-slate-400 hover:text-white transition-colors cursor-pointer"
          title="Close game"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex gap-3 items-start">
        {/* Game Canvas */}
        <div className="relative" style={{ width: CANVAS_W, height: CANVAS_H }}>
          <canvas
            ref={canvasRef}
            width={CANVAS_W}
            height={CANVAS_H}
            style={{
              display: 'block',
              borderRadius: 8,
              border: '1px solid rgba(99,102,241,0.3)',
              background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)',
              boxShadow: '0 0 20px rgba(99,102,241,0.15)',
            }}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          />

          {/* Overlay: Start / Pause / Game Over */}
          {(!started || isPaused || isGameOver) && (
            <div
              className="absolute inset-0 flex flex-col items-center justify-center rounded-lg"
              style={{ background: 'rgba(15,23,42,0.82)', backdropFilter: 'blur(4px)' }}
            >
              {isGameOver ? (
                <>
                  <span className="text-base font-black text-red-400 mb-1">Game Over</span>
                  <span className="text-[11px] text-slate-300 mb-3 font-semibold">
                    Score: <span className="text-yellow-400">{displayScore.toLocaleString()}</span>
                  </span>
                  <button
                    onClick={handleRestart}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-[11px] font-bold shadow-lg cursor-pointer hover:brightness-110 transition-all"
                  >
                    <RotateCcw className="w-3 h-3" /> Play Again
                  </button>
                </>
              ) : isPaused ? (
                <>
                  <span className="text-sm font-black text-blue-300 mb-3">Paused</span>
                  <button
                    onClick={handlePause}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-[11px] font-bold cursor-pointer hover:brightness-110 transition-all"
                  >
                    <Play className="w-3 h-3" /> Resume
                  </button>
                </>
              ) : (
                <>
                  <span className="text-base font-black text-white mb-1">TETRIS</span>
                  <span className="text-[10px] text-slate-400 mb-3 text-center px-3">
                    ← → move &nbsp;↑/X rotate<br />↓ soft drop &nbsp;Space hard drop
                  </span>
                  <button
                    onClick={handleStart}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-black shadow-lg cursor-pointer hover:brightness-110 transition-all"
                  >
                    <Play className="w-3.5 h-3.5" /> Start Game
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Side Panel */}
        <div className="flex flex-col gap-2" style={{ minWidth: 72 }}>
          {/* Next piece */}
          <div
            className="rounded-xl p-1.5"
            style={{
              background: 'linear-gradient(135deg, #0f172a, #1e1b4b)',
              border: '1px solid rgba(99,102,241,0.25)',
            }}
          >
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1 text-center">
              Next
            </p>
            <canvas
              ref={previewRef}
              width={PREVIEW_SIZE}
              height={PREVIEW_SIZE}
              style={{ display: 'block', margin: '0 auto' }}
            />
          </div>

          {/* Score */}
          <div
            className="rounded-xl p-2 text-center"
            style={{
              background: 'linear-gradient(135deg, #0f172a, #1e1b4b)',
              border: '1px solid rgba(99,102,241,0.25)',
            }}
          >
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Score</p>
            <p className="text-[13px] font-black text-yellow-400 leading-tight">
              {displayScore.toLocaleString()}
            </p>
          </div>

          {/* Lines */}
          <div
            className="rounded-xl p-2 text-center"
            style={{
              background: 'linear-gradient(135deg, #0f172a, #1e1b4b)',
              border: '1px solid rgba(99,102,241,0.25)',
            }}
          >
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Lines</p>
            <p className="text-[13px] font-black text-sky-400 leading-tight">{displayLines}</p>
          </div>

          {/* Level */}
          <div
            className="rounded-xl p-2 text-center"
            style={{
              background: 'linear-gradient(135deg, #0f172a, #1e1b4b)',
              border: '1px solid rgba(99,102,241,0.25)',
            }}
          >
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Level</p>
            <p className="text-[13px] font-black text-emerald-400 leading-tight">{displayLevel}</p>
          </div>

          {/* Controls */}
          {started && !isGameOver && (
            <button
              onClick={handlePause}
              title={isPaused ? 'Resume' : 'Pause'}
              className="flex items-center justify-center gap-1 rounded-xl py-1.5 text-[10px] font-bold text-slate-300 hover:text-white transition-colors cursor-pointer"
              style={{
                background: 'linear-gradient(135deg, #0f172a, #1e1b4b)',
                border: '1px solid rgba(99,102,241,0.25)',
              }}
            >
              {isPaused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
              {isPaused ? 'Resume' : 'Pause'}
            </button>
          )}
          {started && (
            <button
              onClick={handleRestart}
              title="Restart"
              className="flex items-center justify-center gap-1 rounded-xl py-1.5 text-[10px] font-bold text-slate-300 hover:text-white transition-colors cursor-pointer"
              style={{
                background: 'linear-gradient(135deg, #0f172a, #1e1b4b)',
                border: '1px solid rgba(99,102,241,0.25)',
              }}
            >
              <RotateCcw className="w-3 h-3" /> Restart
            </button>
          )}
        </div>
      </div>

      {/* Mobile hint */}
      <p className="mt-2 text-[9px] text-slate-500 text-center">
        Mobile: tap to rotate · swipe ←→ move · swipe ↓ hard drop
      </p>
    </div>
  );
};
