// src/components/minigames/MemoryGame.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, Text, View, Dimensions } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import RemoteImage from '../RemoteImage';
import { shuffle } from '@/utils/random';
import { resolveMinigameAsset } from '@/services/minigameService';
import type {
  MemoryCardDef,
  MemoryLevelConfig,
  MinigameOutcome,
} from '@/types/minigame';

interface CardState {
  key: string;
  card: MemoryCardDef;
  flipped: boolean;
  matched: boolean;
}

export interface MemoryGameProps {
  level: MemoryLevelConfig;
  minigameId: string;
  assetFolder: string;
  onComplete: (outcome: MinigameOutcome) => void;
  onQuit: () => void;
}

export function MemoryGame({
  level,
  minigameId,
  assetFolder,
  onComplete,
  onQuit,
}: MemoryGameProps): React.JSX.Element {
  const [cards, setCards] = useState<CardState[]>([]);
  const [firstIndex, setFirstIndex] = useState<number | null>(null);
  const [locked, setLocked] = useState<boolean>(false);
  const [score, setScore] = useState<number>(0);
  const [combo, setCombo] = useState<number>(0);
  const [maxCombo, setMaxCombo] = useState<number>(0);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(
    level.timeLimitSeconds,
  );

  // 响应式尺寸计算
  const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
  const TOP_UI_HEIGHT = 80;
  const BOTTOM_UI_HEIGHT = 80;
  
  // 计算卡片大小
  const availableWidth = SCREEN_WIDTH - 40; // 左右各留 20 padding
  const availableHeight = SCREEN_HEIGHT - TOP_UI_HEIGHT - BOTTOM_UI_HEIGHT;
  
  const cols = level.columns || 3;
  const rows = Math.ceil((level.cards.length * 2) / cols);
  
  // 根据宽高取最小值，保证不越界
  const CARD_SIZE = Math.floor(Math.min(availableWidth / cols, availableHeight / rows) - 8);

  const deck = useMemo(() => {
    const doubled: MemoryCardDef[] = [];
    for (const card of level.cards) {
      doubled.push(card);
      doubled.push({ ...card, id: `${card.id}-copy` });
    }
    return shuffle(doubled);
  }, [level.cards]);

  useEffect(() => {
    const initial: CardState[] = deck.map((card, index) => ({
      key: `${card.id}-${index}`,
      card,
      flipped: false,
      matched: false,
    }));
    setCards(initial);
    setFirstIndex(null);
    setLocked(false);
    setScore(0);
    setCombo(0);
    setMaxCombo(0);
    setRemainingSeconds(level.timeLimitSeconds);
  }, [deck, level.timeLimitSeconds]);

  useEffect(() => {
    if (cards.length === 0) return;
    const timer = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [cards.length]);

  useEffect(() => {
    if (remainingSeconds === 0 && cards.length > 0 && !cards.every((c) => c.matched)) {
      onComplete({
        minigameId,
        levelId: level.id,
        engine: 'memory',
        result: 'defeat',
        score,
        maxCombo,
        durationMs: level.timeLimitSeconds * 1000,
        moodGain: level.moodGain,
        coinReward: level.coinReward,
        energyCost: level.energyCost,
      });
    }
  }, [remainingSeconds, cards, level, minigameId, onComplete, score, maxCombo]);

  const handleFlip = (index: number) => {
    if (locked) return;
    const target = cards[index];
    if (!target || target.flipped || target.matched) return;

    const nextCards = cards.slice();
    nextCards[index] = { ...target, flipped: true };
    setCards(nextCards);

    if (firstIndex === null) {
      setFirstIndex(index);
      return;
    }

    setLocked(true);
    const firstCard = cards[firstIndex];

    if (firstCard && firstCard.card.pairKey === target.card.pairKey) {
      setTimeout(() => {
        const matched = nextCards.map((c, i) =>
          i === firstIndex || i === index ? { ...c, matched: true } : c,
        );
        const newCombo = combo + 1;
        setCards(matched);
        setCombo(newCombo);
        setMaxCombo((prev) => Math.max(prev, newCombo));
        setScore((prev) => prev + 10 + newCombo * 2);
        setFirstIndex(null);
        setLocked(false);

        if (matched.every((c) => c.matched)) {
          onComplete({
            minigameId,
            levelId: level.id,
            engine: 'memory',
            result: 'victory',
            score: score + 10 + newCombo * 2,
            maxCombo: Math.max(maxCombo, newCombo),
            durationMs: (level.timeLimitSeconds - remainingSeconds) * 1000,
            moodGain: level.moodGain,
            coinReward: level.coinReward,
            energyCost: level.energyCost,
          });
        }
      }, 260);
    } else {
      setTimeout(() => {
        const reverted = nextCards.map((c, i) =>
          i === firstIndex || i === index ? { ...c, flipped: false } : c,
        );
        setCards(reverted);
        setCombo(0);
        setFirstIndex(null);
        setLocked(false);
      }, 700);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#0F172A' }}>
      {/* 顶部信息 */}
      <View style={{ position: 'absolute', top: 50, width: SCREEN_WIDTH, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 30, zIndex: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Ionicons name="time-outline" size={18} color="#EF4444" />
          <Text style={{ color: '#EF4444', fontSize: 18, fontWeight: '700', marginLeft: 4 }}>{remainingSeconds}s</Text>
        </View>
        <Text style={{ color: '#F8FAFC', fontSize: 18, fontWeight: '700' }}>分数 {score}</Text>
      </View>

      {/* 卡片区域 */}
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 40 }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', width: CARD_SIZE * cols + (cols * 8) }}>
          {cards.map((card, index) => (
            <MemoryCardView
              key={card.key}
              card={card}
              assetFolder={assetFolder}
              width={CARD_SIZE}
              onPress={() => handleFlip(index)}
            />
          ))}
        </View>
      </View>

      {/* 底部退出 */}
      <View style={{ position: 'absolute', bottom: 30, width: SCREEN_WIDTH, paddingHorizontal: 40 }}>
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

function MemoryCardView({ card, assetFolder, width, onPress }: { card: CardState; assetFolder: string; width: number; onPress: () => void; }) {
  const visible = card.flipped || card.matched;
  const imageUrl = resolveMinigameAsset(assetFolder ? `${assetFolder}/${card.card.image}` : card.card.image);
  const backUrl = resolveMinigameAsset(assetFolder ? `${assetFolder}/card_back.png` : 'card_back.png');

  return (
    <Pressable
      onPress={onPress}
      style={{ width, height: width, margin: 4, borderRadius: 12, overflow: 'hidden' }}
    >
      {visible ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1E293B', borderWidth: 2, borderColor: '#2563EB' }}>
          <RemoteImage uri={imageUrl} width={width - 8} height={width - 8} fallbackIcon="star" />
        </View>
      ) : (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(37,99,235,0.2)', borderWidth: 1, borderColor: 'rgba(37,99,235,0.4)' }}>
          <RemoteImage uri={backUrl} width={width - 8} height={width - 8} fallbackIcon="help" />
        </View>
      )}
    </Pressable>
  );
}

export default MemoryGame;
