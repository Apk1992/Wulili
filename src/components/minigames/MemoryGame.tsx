// src/components/minigames/MemoryGame.tsx
import React, { useEffect, useState } from 'react';
import { Pressable, Text, View, Dimensions, ActivityIndicator, Image } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
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

export interface ExtendedMemoryLevelConfig extends MemoryLevelConfig {
  pairs?: number;
  cardBack?: string;
}

export interface MemoryGameProps {
  level: ExtendedMemoryLevelConfig;
  minigameId: string;
  assetFolder: string;
  onComplete: (outcome: MinigameOutcome) => void;
  onQuit: () => void;
}

const FIXED_CARD_SIZE = 76;

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
    level.timeLimitSeconds || 60,
  );
  
  const [isLoadingPool, setIsLoadingPool] = useState(true);

  const { width: SCREEN_WIDTH } = Dimensions.get('window');
  const cols = level.columns || 3;

  // 开局拉卡池 + 预加载图片
  useEffect(() => {
    let isMounted = true;
    setIsLoadingPool(true);

    (async () => {
      let allCards: string[] = [];
      try {
        const url = resolveMinigameAsset('minigames/memory/cards.json');
        const res = await fetch(url);
        if (res.ok) {
          const json = await res.json();
          if (Array.isArray(json.cards) && json.cards.length > 0) allCards = json.cards;
        }
      } catch (e) {}

      if (!isMounted) return;

      if (allCards.length === 0) {
        allCards = ['card_a.png', 'card_b.png', 'card_c.png', 'card_d.png', 'card_e.png', 'card_f.png'];
      }

      const shuffledPool = shuffle(allCards);
      const needPairs = level.pairs || Math.min(6, shuffledPool.length);
      const selectedImages = shuffledPool.slice(0, needPairs);

      const backImg = level.cardBack || 'card_back.png';
      const urlsToPreload = selectedImages.map(img => 
        resolveMinigameAsset(assetFolder ? `${assetFolder}/${img}` : img)
      );
      urlsToPreload.push(
        resolveMinigameAsset(assetFolder ? `${assetFolder}/${backImg}` : backImg)
      );

      await Promise.all(urlsToPreload.map(url => Image.prefetch(url).catch(() => {})));

      if (!isMounted) return;

      const doubled: MemoryCardDef[] = [];
      selectedImages.forEach((img, idx) => {
        const def: MemoryCardDef = { id: `c${idx}`, pairKey: `pair_${idx}`, image: img };
        doubled.push(def);
        doubled.push({ ...def, id: `c${idx}-copy` });
      });

      const finalDeck = shuffle(doubled);
      const initial: CardState[] = finalDeck.map((card, index) => ({
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
      setRemainingSeconds(level.timeLimitSeconds || 60);
      setIsLoadingPool(false);
    })();

    return () => { isMounted = false; };
  }, [level, assetFolder]);

  // 倒计时
  useEffect(() => {
    if (isLoadingPool || cards.length === 0) return;
    const timer = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) { clearInterval(timer); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isLoadingPool, cards.length]);

  // 超时结算
  useEffect(() => {
    if (remainingSeconds === 0 && cards.length > 0 && !cards.every((c) => c.matched)) {
      onComplete({
        minigameId,
        levelId: level.id,
        engine: 'memory',
        result: 'defeat',
        score,
        maxCombo,
        durationMs: (level.timeLimitSeconds || 60) * 1000,
        moodGain: level.moodGain,
        coinReward: level.coinReward,
        energyCost: level.energyCost,
      });
    }
  }, [remainingSeconds, cards, level, minigameId, onComplete, score, maxCombo]);

  // 翻牌
  const handleFlip = (index: number) => {
    if (locked || isLoadingPool) return;
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
            durationMs: ((level.timeLimitSeconds || 60) - remainingSeconds) * 1000,
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

  if (isLoadingPool) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0F172A', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#38BDF8" />
        <Text style={{ color: '#F8FAFC', marginTop: 16 }}>正在准备牌堆…</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#0F172A' }}>
      <View style={{ position: 'absolute', top: 50, width: SCREEN_WIDTH, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 30, zIndex: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Ionicons name="time-outline" size={18} color="#EF4444" />
          <Text style={{ color: '#EF4444', fontSize: 18, fontWeight: '700', marginLeft: 4 }}>{remainingSeconds}s</Text>
        </View>
        <Text style={{ color: '#F8FAFC', fontSize: 18, fontWeight: '700' }}>分数 {score}</Text>
      </View>

      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 40 }}>
        <View style={{ 
          flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', 
          width: Math.min(SCREEN_WIDTH - 40, cols * (FIXED_CARD_SIZE + 8)),
        }}>
          {cards.map((card, index) => (
            <MemoryCardView
              key={card.key}
              card={card}
              assetFolder={assetFolder}
              backImage={level.cardBack || 'card_back.png'}
              width={FIXED_CARD_SIZE}
              onPress={() => handleFlip(index)}
            />
          ))}
        </View>
      </View>

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

// 🔥 彻底重写卡牌渲染：用原生的 Image 和 onLoad 控制，彻底消灭白块
function MemoryCardView({ card, assetFolder, backImage, width, onPress }: { card: CardState; assetFolder: string; backImage: string; width: number; onPress: () => void; }) {
  const [imgLoading, setImgLoading] = useState(true);
  const [imgError, setImgError] = useState(false);
  
  const visible = card.flipped || card.matched;
  const imageUrl = resolveMinigameAsset(assetFolder ? `${assetFolder}/${card.card.image}` : card.card.image);
  const backUrl = resolveMinigameAsset(assetFolder ? `${assetFolder}/${backImage}` : backImage);

  return (
    <Pressable
      onPress={onPress}
      style={{ width, height: width, margin: 4, borderRadius: 12, overflow: 'hidden' }}
    >
      {visible ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1E293B', borderWidth: 2, borderColor: '#2563EB' }}>
          {/* 如果图片还没加载完，显示深色底 + 加载圈 */}
          {(imgLoading || imgError) && <ActivityIndicator size="small" color="#2563EB" style={{ position: 'absolute' }} />}
          {imgError && <Ionicons name="help" size={width * 0.5} color="#475569" style={{ position: 'absolute' }} />}
          
          <Image
            source={{ uri: imageUrl }}
            style={{ width: width - 8, height: width - 8, borderRadius: 8, opacity: imgLoading ? 0 : 1 }}
            onLoadStart={() => setImgLoading(true)}
            onLoad={() => setImgLoading(false)}
            onError={() => { setImgLoading(false); setImgError(true); }}
          />
        </View>
      ) : (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(37,99,235,0.2)', borderWidth: 1, borderColor: 'rgba(37,99,235,0.4)' }}>
          <Image
            source={{ uri: backUrl }}
            style={{ width: width - 8, height: width - 8, borderRadius: 8 }}
            resizeMode="contain"
          />
        </View>
      )}
    </Pressable>
  );
}

export default MemoryGame;
