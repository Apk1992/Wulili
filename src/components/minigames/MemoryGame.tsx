import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import RemoteImage from '../RemoteImage';
import { useGitHubImage } from '@/hooks/useGitHubImage';
import { shuffle } from '@/utils/random';
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
    <View className="flex-1">
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-row items-center">
          <Ionicons name="time-outline" size={16} color="#EF4444" />
          <Text className="ml-1 text-sm font-semibold text-danger">
            {remainingSeconds}s
          </Text>
        </View>
        <Text className="text-sm font-semibold text-text dark:text-dark-text">
          分数 {score}
        </Text>
        <Pressable
          onPress={onQuit}
          className="p-2 rounded-full active:opacity-60"
        >
          <Ionicons name="close" size={20} color="#94A3B8" />
        </Pressable>
      </View>

      <View
        className="flex-row flex-wrap justify-center"
        style={{ marginHorizontal: -4 }}
      >
        {cards.map((card, index) => (
          <MemoryCardView
            key={card.key}
            card={card}
            assetFolder={assetFolder}
            width={computeCardWidth(cards.length, level.columns)}
            onPress={() => handleFlip(index)}
          />
        ))}
      </View>
    </View>
  );
}

function computeCardWidth(total: number, columns: number): number {
  const screenWidth = 340;
  return Math.floor((screenWidth - columns * 12) / columns);
}

interface MemoryCardViewProps {
  card: CardState;
  assetFolder: string;
  width: number;
  onPress: () => void;
}

function MemoryCardView({
  card,
  assetFolder,
  width,
  onPress,
}: MemoryCardViewProps): React.JSX.Element {
  const visible = card.flipped || card.matched;
  const imagePath = `${assetFolder}/${card.card.image}`;
  const { url } = useGitHubImage(imagePath, true);
  const backPath = `${assetFolder}/card_back.png`;
  const { url: backUrl } = useGitHubImage(backPath, true);

  return (
    <Pressable
      onPress={onPress}
      style={{ width, height: width, margin: 4 }}
      className="rounded-xl overflow-hidden active:opacity-80"
    >
      {visible ? (
        <View className="flex-1 items-center justify-center rounded-xl bg-card dark:bg-dark-card border border-primary">
          <RemoteImage uri={url} width={width - 8} height={width - 8} fallbackIcon="star" />
        </View>
      ) : (
        <View className="flex-1 items-center justify-center rounded-xl bg-primary/20 dark:bg-primary/30 border border-primary/40">
          <RemoteImage
            uri={backUrl}
            width={width - 8}
            height={width - 8}
            fallbackIcon="help"
          />
        </View>
      )}
    </Pressable>
  );
}

export default MemoryGame;