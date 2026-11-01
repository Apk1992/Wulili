// src/components/minigames/TetrisGame.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, Text, View, Dimensions, PanResponder } from 'react-native';
import type { TetrisLevelConfig, MinigameOutcome } from '@/types/minigame';

const COLS = 10;
const ROWS = 20;

type Cell = 0 | 1;
type Board = Cell[][];

interface ShapeDef {
  cells: number[][];
  color: string;
}

const SHAPES: ShapeDef[] = [
  { cells: [[1, 1, 1, 1]], color: '#38BDF8' },            // I
  { cells: [[1, 1], [1, 1]], color: '#FACC15' },          // O
  { cells: [[0, 1, 0], [1, 1, 1]], color: '#A78BFA' },    // T
  { cells: [[1, 0, 0], [1, 1, 1]], color: '#FB923C' },    // L
  { cells: [[0, 0, 1], [1, 1, 1]], color: '#60A5FA' },    // J
  { cells: [[0, 1, 1], [1, 1, 0]], color: '#4ADE80' },    // S
  { cells: [[1, 1, 0], [0, 1, 1]], color: '#F87171' },    // Z
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
      if (board[r][c]) return true;
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
  const kept = board.filter((row) => row.some((c) => c === 0));
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

  // 🔥 手势控制 (PanResponder) - 优化版
  const lastMoveX = useRef(0);
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 5 || Math.abs(gestureState.dy) > 5;
      },
      onPanResponderMove: (evt, gestureState) => {
        // 灵敏度：每滑动 20 像素移动一格（可自行调整）
        const MOVE_THRESHOLD = 20; 
        const { dx } = gestureState;

        // 如果水平滑动超过了阈值
        if (Math.abs(dx) > MOVE_THRESHOLD) {
          const steps = Math.floor(Math.abs(dx) / MOVE_THRESHOLD);
          const direction = dx > 0 ? 1 : -1;
          const targetCol = pieceRef.current.col + direction * steps;
          
          // 避免无限连发，计算实际能移动几格
          let moved = 0;
          for (let i = 0; i < steps; i++) {
            if (!collides(boardRef.current, pieceRef.current, 0, direction)) {
              // 这里需要直接修改 piece 状态，但因为在手势里不触发重渲染太频繁
              // 改用一次性移动多格的方法
            }
          }
          
          // 直接根据当前计算出的移动距离，算出目标位置并应用
          const cur = pieceRef.current;
          let finalCol = cur.col;
          for (let i = 0; i < steps; i++) {
            if (!collides(boardRef.current, { ...cur, col: finalCol + direction }, 0, 0)) {
              finalCol += direction;
            }
          }
          if (finalCol !== cur.col) {
            setPiece({ ...cur, col: finalCol });
            // 重置滑动基准，避免一次滑得太远直接飞到边缘
            gestureState.dx = 0; 
          }
        }
      },
      onPanResponderRelease: (evt, gestureState) => {
        const { dx, dy } = gestureState;

        // 如果滑动距离非常小，视为点击（旋转）
        if (Math.abs(dx) < 10 && Math.abs(dy) < 10) {
          rotatePiece();
          return;
        }

        // 如果竖直滑动很大（向下），视为硬降
        if (dy > 50 && Math.abs(dy) > Math.abs(dx)) {
          hardDrop();
        }
      },
    })
  ).current;

  // 🔥 计算方块落底的影子位置
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
      // 1. 先画影子（用 2 代表影子）
      for (let i = 0; i < piece.shape.length; i++) {
        for (let j = 0; j < piece.shape[i].length; j++) {
          if (!piece.shape[i][j]) continue;
          const r = shadowRow + i;
          const c = piece.col + j;
          if (r >= 0 && r < ROWS && c >= 0 && c < COLS) {
             // 只有当影子的位置不是当前方块的位置时，才显示影子
             if (r !== piece.row + i) {
               b[r][c] = 2 as any; 
             }
          }
        }
      }
      // 2. 再画当前方块（用 1 代表当前方块）
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

  // 🔥 响应式计算格子大小
  const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
  const TOP_UI_HEIGHT = 100;
  const BOTTOM_UI_HEIGHT = 60;
  
  const availableHeight = SCREEN_HEIGHT - TOP_UI_HEIGHT - BOTTOM_UI_HEIGHT;
  const CELL_SIZE = Math.floor(Math.min(SCREEN_WIDTH / COLS, availableHeight / ROWS) * 0.95);
  
  const BOARD_WIDTH = CELL_SIZE * COLS;
  const BOARD_HEIGHT = CELL_SIZE * ROWS;

  return (
    <View style={{ flex: 1, backgroundColor: '#0F172A' }}>
      
      {/* 顶部信息栏 */}
      <View style={{ position: 'absolute', top: 50, width: SCREEN_WIDTH, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 30, zIndex: 10 }}>
        <Text style={{ color: '#F8FAFC', fontSize: 18, fontWeight: '700' }}>消行 {lines}</Text>
        <Text style={{ color: '#F8FAFC', fontSize: 18, fontWeight: '700' }}>⏱ {secondsLeft}s</Text>
      </View>

      {/* 游戏操作区（铺满全屏，用于接收手势） */}
      <View 
        style={{ flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 40 }}
        {...panResponder.panHandlers}
      >
        {/* 棋盘背景 */}
        <View style={{ 
          width: BOARD_WIDTH, 
          height: BOARD_HEIGHT, 
          backgroundColor: '#1E293B', 
          borderWidth: 1, 
          borderColor: '#334155',
          position: 'relative'
        }}>
          
          {/* 🔥 画底层网格 */}
          {Array.from({ length: ROWS }).map((_, r) => (
            <View key={`row-${r}`} style={{ position: 'absolute', top: r * CELL_SIZE, left: 0, right: 0, height: 1, backgroundColor: 'rgba(255,255,255,0.05)' }} />
          ))}
          {Array.from({ length: COLS }).map((_, c) => (
            <View key={`col-${c}`} style={{ position: 'absolute', top: 0, bottom: 0, left: c * CELL_SIZE, width: 1, backgroundColor: 'rgba(255,255,255,0.05)' }} />
          ))}

          {/* 🔥 渲染方块（包含影子和当前方块） */}
          {displayBoard.map((row, ri) => (
            <View key={ri} style={{ flexDirection: 'row', position: 'absolute', top: ri * CELL_SIZE }}>
              {row.map((cell, ci) => {
                // 判断是否是当前方块
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
                
                // 决定颜色
                let color = 'transparent';
                let isGhost = false;

                if (isPiece) {
                  color = piece.color;
                } else if (cell === 2) {
                  // 🔥 影子方块特殊样式
                  isGhost = true;
                  color = 'rgba(255,255,255,0.1)'; // 半透明白色影子
                } else if (cell === 1) {
                  // 已经固定的方块
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
                      borderColor: isGhost ? 'rgba(255,255,255,0.3)' : '#1E293B', // 影子的边框稍微亮一点
                    }}
                  />
                );
              })}
            </View>
          ))}
        </View>
      </View>

      {/* 底部退出按钮 */}
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
