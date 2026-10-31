// src/components/minigames/TetrisGame.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
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

  const move = (dCol: number) => {
    if (finishedRef.current) return;
    const cur = pieceRef.current;
    if (!collides(boardRef.current, cur, 0, dCol)) {
      setPiece({ ...cur, col: cur.col + dCol });
    }
  };

  const rotatePiece = () => {
    if (finishedRef.current) return;
    const cur = pieceRef.current;
    const rotated = rotate(cur.shape);
    if (!collides(boardRef.current, cur, 0, 0, rotated)) {
      setPiece({ ...cur, shape: rotated });
    }
  };

  const hardDrop = () => {
    if (finishedRef.current) return;
    let cur = pieceRef.current;
    while (!collides(boardRef.current, cur, 1, 0)) {
      cur = { ...cur, row: cur.row + 1 };
    }
    setPiece(cur);
    setTimeout(() => drop(), 0);
  };

  const displayBoard = useMemo(() => {
    const b = board.map((row) => row.slice());
    if (!finished) {
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
  }, [board, piece, finished]);

  return (
    <View style={{ flex: 1, backgroundColor: '#0F172A', paddingTop: 60 }}>
      {/* 顶部信息：加固了字体高度 */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 12 }}>
        <Text style={{ color: '#F8FAFC', fontSize: 16, lineHeight: 24, fontWeight: '700' }}>
          消行 {lines}/{level.targetLines}
        </Text>
        <Text style={{ color: '#F8FAFC', fontSize: 16, lineHeight: 24, fontWeight: '700' }}>
          ⏱ {secondsLeft}s
        </Text>
      </View>

      {/* 棋盘：强制居中 */}
      <View style={{ flex: 1, alignItems: 'center' }}>
        <View style={{ backgroundColor: '#1E293B', padding: 4, borderRadius: 8, borderWidth: 1, borderColor: '#334155' }}>
          {displayBoard.map((row, ri) => (
            <View key={ri} style={{ flexDirection: 'row' }}>
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
                const color = isPiece ? piece.color : cell ? '#64748B' : 'transparent';
                return (
                  <View
                    key={ci}
                    style={{
                      width: 16,
                      height: 16,
                      margin: 1,
                      borderRadius: 2,
                      backgroundColor: color,
                      borderWidth: cell || isPiece ? 1 : 0,
                      borderColor: '#0F172A',
                    }}
                  />
                );
              })}
            </View>
          ))}
        </View>
      </View>

      {/* 控制按钮 */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-evenly', marginTop: 20, paddingHorizontal: 20 }}>
        <CtrlBtn label="←" onPress={() => move(-1)} />
        <CtrlBtn label="↻" onPress={rotatePiece} />
        <CtrlBtn label="↓" onPress={hardDrop} />
        <CtrlBtn label="→" onPress={() => move(1)} />
      </View>

      {/* 退出按钮：加固字体 */}
      <View style={{ marginTop: 20, marginBottom: 40, paddingHorizontal: 20 }}>
        <Pressable
          onPress={onQuit}
          style={{
            paddingVertical: 14,
            borderRadius: 12,
            alignItems: 'center',
            backgroundColor: 'rgba(239,68,68,0.2)',
            borderWidth: 1,
            borderColor: '#EF4444',
          }}
        >
          <Text style={{ color: '#EF4444', fontSize: 16, lineHeight: 24, fontWeight: '700' }}>退出</Text>
        </Pressable>
      </View>
    </View>
  );
}

function CtrlBtn({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: pressed ? '#1D4ED8' : '#2563EB',
        alignItems: 'center',
        justifyContent: 'center',
      })}
    >
      <Text style={{ color: '#FFFFFF', fontSize: 24, lineHeight: 32, fontWeight: '700' }}>{label}</Text>
    </Pressable>
  );
}

export default TetrisGame;
