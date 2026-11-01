// src/components/minigames/TetrisGame.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, Text, View, Dimensions, PanResponder } from 'react-native';
import type { TetrisLevelConfig, MinigameOutcome } from '@/types/minigame';

const COLS = 10;
const ROWS = 20;

type Cell = 0 | 1 | 2; // 1 = 固定方块, 2 = 影子
type Board = Cell[][];

interface ShapeDef {
  cells: number[][];
  color: string;
}

const SHAPES: ShapeDef[] = [
  { cells: [[1, 1, 1, 1]], color: '#38BDF8' },
  { cells: [[1, 1], [1, 1]], color: '#FACC15' },
  { cells: [[0, 1, 0], [1, 1, 1]], color: '#A78BFA' },
  { cells: [[1, 0, 0], [1, 1, 1]], color: '#FB923C' },
  { cells: [[0, 0, 1], [1, 1, 1]], color: '#60A5FA' },
  { cells: [[0, 1, 1], [1, 1, 0]], color: '#4ADE80' },
  { cells: [[1, 1, 0], [0, 1, 1]], color: '#F87171' },
];

function emptyBoard(): Board {
  return Array.from({ length: ROWS }, () => Array<Cell>(COLS).fill(0));
}

function rotate(matrix: number[][]): number[][] {
  const n = matrix.length;
  const m = matrix[0].length;
  const out = Array.from({ length: m }, () => Array<number>(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < m; j++) {
      out[j][n - 1 - i] = matrix[i][j];
    }
  }
  return out;
}

interface Piece {
  shape: number[][];
  color: string;
  row: number;
  col: number;
}

function spawnPiece(): Piece {
  const def = SHAPES[Math.floor(Math.random() * SHAPES.length)];
  return {
    shape: def.cells,
    color: def.color,
    row: 0,
    col: Math.floor((COLS - def.cells[0].length) / 2),
  };
}

function collides(
  board: Board,
  piece: Piece,
  dRow = 0,
  dCol = 0,
  shapeOverride?: number[][],
): boolean {
  const s = shapeOverride ?? piece.shape;
  for (let i = 0; i < s.length; i++) {
    for (let j = 0; j < s[i].length; j++) {
      if (!s[i][j]) continue;
      const r = piece.row + i + dRow;
      const c = piece.col + j + dCol;
      if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return true;
      if (board[r][c] === 1) return true;
    }
  }
  return false;
}

function mergePiece(board: Board, piece: Piece): Board {
  const next = board.map((row) => row.slice());
  for (let i = 0; i < piece.shape.length; i++) {
    for (let j = 0; j < piece.shape[i].length; j++) {
      if (piece.shape[i][j]) {
        next[piece.row + i][piece.col + j] = 1;
      }
    }
  }
  return next;
}

function clearLines(board: Board): { board: Board; cleared: number } {
  const kept = board.filter((row) => row.some((c) => c === 0 || c === 2));
  const cleared = ROWS - kept.length;
  const emptyRows = Array.from({ length: cleared }, () => Array<Cell>(COLS).fill(0));
  return { board: [...emptyRows, ...kept], cleared };
}

export interface TetrisGameProps {
  level: TetrisLevelConfig;
  minigameId: string;
  onComplete: (outcome: MinigameOutcome) => void;
  onQuit: () => void;
}

export function TetrisGame({
  level,
  minigameId,
  onComplete,
  onQuit,
}: TetrisGameProps): React.JSX.Element {
  const [board, setBoard] = useState<Board>(emptyBoard);
  const [piece, setPiece] = useState<Piece>(spawnPiece);
  const [lines, setLines] = useState(0);
  const [startedAt] = useState(Date.now());
  const [secondsLeft, setSecondsLeft] = useState(level.timeLimitSeconds);
  const [finished, setFinished] = useState(false);

  const boardRef = useRef(board);
  const pieceRef = useRef(piece);
  const linesRef = useRef(lines);
  const finishedRef = useRef(finished);

  boardRef.current = board;
  pieceRef.current = piece;
  linesRef.current = lines;
  finishedRef.current = finished;

  const finish = useCallback(
    (result: 'victory' | 'defeat') => {
      if (finishedRef.current) return;
      finishedRef.current = true;
      setFinished(true);
      const durationMs = Date.now() - startedAt;
      onComplete({
        minigameId,
        levelId: level.id,
        engine: 'tetris',
        result,
        score: linesRef.current,
        maxCombo: 0,
        durationMs,
        moodGain: result === 'victory' ? level.moodGain : 0,
        coinReward: result === 'victory' ? level.coinReward : 0,
        energyCost: level.energyCost,
      });
    },
    [startedAt, minigameId, level, onComplete],
  );

  const drop = useCallback(() => {
    if (finishedRef.current) return;
    const cur = pieceRef.current;
    if (!collides(boardRef.current, cur, 1, 0)) {
      setPiece({ ...cur, row: cur.row + 1 });
      return;
    }
    const merged = mergePiece(boardRef.current, cur);
    const { board: cleared, cleared: n } = clearLines(merged);
    const newLines = linesRef.current + n;
    setBoard(cleared);
    setLines(newLines);
    if (newLines >= level.targetLines) {
      finish('victory');
      return;
    }
    const next = spawnPiece();
    if (collides(cleared, next)) {
      finish('defeat');
      return;
    }
    setPiece(next);
  }, [level.targetLines, finish]);

  useEffect(() => {
    if (finished) return;
    const id = setInterval(drop, level.dropIntervalMs);
    return () => clearInterval(id);
  }, [drop, level.dropIntervalMs, finished]);

  useEffect(() => {
    if (finished) return;
    const id = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          finish('defeat');
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [finished, finish]);

  const move = useCallback((dCol: number) => {
    if (finishedRef.current) return;
    const cur = pieceRef.current;
    if (!collides(boardRef.current, cur, 0, dCol)) {
      setPiece({ ...cur, col: cur.col + dCol });
    }
  }, []);

  const rotatePiece = useCallback(() => {
    if (finishedRef.current) return;
    const cur = pieceRef.current;
    const rotated = rotate(cur.shape);
    if (!collides(boardRef.current, cur, 0, 0, rotated)) {
      setPiece({ ...cur, shape: rotated });
    }
  }, []);

  const hardDrop = useCallback(() => {
    if (finishedRef.current) return;
    let cur = pieceRef.current;
    while (!collides(boardRef.current, cur, 1, 0)) {
      cur = { ...cur, row: cur.row + 1 };
    }
    setPiece(cur);
    setTimeout(() => drop(), 0);
  }, [drop]);

  // 🔥 修复：把内部状态移到 PanResponder 上方
  const gestureState = useRef({
    lastDx: 0,
    hasMoved: false,
    lockedAxis: null as 'horizontal' | 'vertical' | null,
  });

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        gestureState.current = {
          lastDx: 0,
          hasMoved: false,
          lockedAxis: null,
        };
      },
      onPanResponderMove: (evt, gestureStateNative) => {
        const state = gestureState.current; // 现在这里安全了
        const { dx, dy } = gestureStateNative;

        // 1. 判断主导轴
        if (!state.lockedAxis) {
          if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
            state.lockedAxis = Math.abs(dx) > Math.abs(dy) ? 'horizontal' : 'vertical';
          }
        }

        // 2. 垂直滑动（硬降）
        if (state.lockedAxis === 'vertical') {
          if (dy > 30 && !state.hasMoved) {
            hardDrop();
            state.hasMoved = true;
          }
          return;
        }

        // 3. 水平滑动
        if (state.lockedAxis === 'horizontal') {
          const MOVE_THRESHOLD = 25;
          const diff = dx - state.lastDx;
          
          if (Math.abs(diff) >= MOVE_THRESHOLD) {
            const steps = Math.floor(Math.abs(diff) / MOVE_THRESHOLD);
            const direction = diff > 0 ? 1 : -1;
            
            let cur = pieceRef.current;
            let moved = false;
            for (let i = 0; i < steps; i++) {
              if (!collides(boardRef.current, cur, 0, direction)) {
                cur = { ...cur, col: cur.col + direction };
                moved = true;
              } else {
                break;
              }
            }
            if (moved) {
              setPiece(cur);
              state.hasMoved = true;
              state.lastDx = dx - (diff % MOVE_THRESHOLD) * direction;
            }
          }
        }
      },
      onPanResponderRelease: (evt, gestureStateNative) => {
        const state = gestureState.current;
        // 如果完全没滑动过且位移极小，视为点击旋转
        if (!state.hasMoved && Math.abs(gestureStateNative.dx) < 10 && Math.abs(gestureStateNative.dy) < 10) {
          rotatePiece();
        }
      },
    })
  ).current;

  // 计算影子
  const shadowRow = useMemo(() => {
    if (finished) return piece.row;
    let testRow = piece.row;
    while (!collides(board, { ...piece, row: testRow + 1 }, 0, 0)) {
      testRow++;
    }
    return testRow;
  }, [board, piece, finished]);

  const displayBoard = useMemo(() => {
    const b = board.map((row) => row.slice());
    if (!finished) {
      // 画影子
      for (let i = 0; i < piece.shape.length; i++) {
        for (let j = 0; j < piece.shape[i].length; j++) {
          if (!piece.shape[i][j]) continue;
          const r = shadowRow + i;
          const c = piece.col + j;
          if (r >= 0 && r < ROWS && c >= 0 && c < COLS) {
             if (r !== piece.row + i) b[r][c] = 2;
          }
        }
      }
      // 画当前
      for (let i = 0; i < piece.shape.length; i++) {
        for (let j = 0; j < piece.shape[i].length; j++) {
          if (!piece.shape[i][j]) continue;
          const r = piece.row + i;
          const c = piece.col + j;
          if (r >= 0 && r < ROWS && c >= 0 && c < COLS) b[r][c] = 1;
        }
      }
    }
    return b;
  }, [board, piece, finished, shadowRow]);

  const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
  const TOP_UI_HEIGHT = 100;
  const BOTTOM_UI_HEIGHT = 60;
  
  const availableHeight = SCREEN_HEIGHT - TOP_UI_HEIGHT - BOTTOM_UI_HEIGHT;
  const CELL_SIZE = Math.floor(Math.min(SCREEN_WIDTH / COLS, availableHeight / ROWS) * 0.95);
  
  const BOARD_WIDTH = CELL_SIZE * COLS;
  const BOARD_HEIGHT = CELL_SIZE * ROWS;

  return (
    <View style={{ flex: 1, backgroundColor: '#0F172A' }}>
      <View style={{ position: 'absolute', top: 50, width: SCREEN_WIDTH, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 30, zIndex: 10 }}>
        <Text style={{ color: '#F8FAFC', fontSize: 18, fontWeight: '700' }}>消行 {lines}</Text>
        <Text style={{ color: '#F8FAFC', fontSize: 18, fontWeight: '700' }}>⏱ {secondsLeft}s</Text>
      </View>

      <View 
        style={{ flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 40 }}
        {...panResponder.panHandlers}
      >
        <View style={{ 
          width: BOARD_WIDTH, 
          height: BOARD_HEIGHT, 
          backgroundColor: '#1E293B', 
          borderWidth: 1, 
          borderColor: '#334155',
          position: 'relative'
        }}>
          {Array.from({ length: ROWS }).map((_, r) => (
            <View key={`row-${r}`} style={{ position: 'absolute', top: r * CELL_SIZE, left: 0, right: 0, height: 1, backgroundColor: 'rgba(255,255,255,0.05)' }} />
          ))}
          {Array.from({ length: COLS }).map((_, c) => (
            <View key={`col-${c}`} style={{ position: 'absolute', top: 0, bottom: 0, left: c * CELL_SIZE, width: 1, backgroundColor: 'rgba(255,255,255,0.05)' }} />
          ))}

          {displayBoard.map((row, ri) => (
            <View key={ri} style={{ flexDirection: 'row', position: 'absolute', top: ri * CELL_SIZE }}>
              {row.map((cell, ci) => {
                let isPiece = false;
                if (!finished) {
                  for (let i = 0; i < piece.shape.length; i++) {
                    for (let j = 0; j < piece.shape[i].length; j++) {
                      if (piece.shape[i][j] && piece.row + i === ri && piece.col + j === ci) {
                        isPiece = true;
                      }
                    }
                  }
                }
                
                let color = 'transparent';
                let isGhost = false;

                if (isPiece) {
                  color = piece.color;
                } else if (cell === 2) {
                  isGhost = true;
                  color = 'rgba(255,255,255,0.1)';
                } else if (cell === 1) {
                  color = '#64748B';
                }

                return (
                  <View
                    key={ci}
                    style={{
                      position: 'absolute',
                      left: ci * CELL_SIZE,
                      width: CELL_SIZE,
                      height: CELL_SIZE,
                      backgroundColor: color,
                      borderWidth: (cell === 1 || isPiece) ? 1 : (isGhost ? 1 : 0),
                      borderColor: isGhost ? 'rgba(255,255,255,0.3)' : '#1E293B',
                    }}
                  />
                );
              })}
            </View>
          ))}
        </View>
      </View>

      <View style={{ position: 'absolute', bottom: 20, width: SCREEN_WIDTH, paddingHorizontal: 40 }}>
        <Pressable
          onPress={onQuit}
          style={{ paddingVertical: 12, borderRadius: 12, alignItems: 'center', backgroundColor: 'rgba(239,68,68,0.2)', borderWidth: 1, borderColor: '#EF4444' }}
        >
          <Text style={{ color: '#EF4444', fontSize: 16, fontWeight: '700' }}>退出游戏</Text>
        </Pressable>
      </View>
    </View>
  );
}

export default TetrisGame;
