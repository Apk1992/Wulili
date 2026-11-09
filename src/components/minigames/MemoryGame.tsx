// src/components/minigames/MemoryGame.tsx
import React, { useEffect, useState, useCallback } from 'react';
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

// 🔥 固定的卡片基础大小
const BASE_CARD_SIZE = 84;

export function MemoryGame({
  level,
  minigameId,
  assetFolder,
  onComplete,
  onQuit,
}: MemoryGameProps): React.JSX.Element {
  const [allCardsPool, setAllCardsPool] = useState<string[]>([]);
  
  // 动态关卡状态
  const [stage, setStage] = useState<number>(1);
  const [currentCards, setCurrentCards] = useState<CardState[]>([]);
  const [currentCols, setCurrentCols] = useState<number>(2);

  const [firstIndex, setFirstIndex] = useState<number | null>(null);
  const [locked, setLocked] = useState<boolean>(false);
  const [score, setScore] = useState<number>(0);
  const [totalMatches, setTotalMatches] = useState<number>(0);
  
  // 时间机制
  const [remainingSeconds, setRemainingSeconds] = useState<number>(
    level.timeLimitSeconds || 60,
  );
  
  const [isLoadingPool, setIsLoadingPool] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const { width: SCREEN_WIDTH } = Dimensions.get('window');

  // 计算当前关卡应该有多少对牌、几列
  const getStageConfig = (stageNum: number) => {
    if (stageNum === 1) return { pairs: 2, cols: 2 };
    if (stageNum === 2) return { pairs: 3, cols: 3 };
    if (stageNum === 3) return { pairs: 4, cols: 4 };
    if (stageNum === 4) return { pairs: 6, cols: 4 };
    // 第 5 关及以后，封顶为 8 对牌（16张），4列
    return { pairs: 8, cols: 4 };
  };

  // 生成当前关卡的牌
  const buildStageDeck = useCallback((stageNum: number, pool: string[]) => {
    const { pairs, cols } = getStageConfig(stageNum);
    setCurrentCols(cols);

    const shuffledPool = shuffle(pool);
    // 如果卡池不够，循环复制补齐
    const selectedImages: string[] = [];
    for (let i = 0; i < pairs; i++) {
      selectedImages.push(shuffledPool[i % shuffledPool.length]);
    }

    const doubled: MemoryCardDef[] = [];
    selectedImages.forEach((img, idx) => {
      const def: MemoryCardDef = { id: `s${stageNum}_c${idx}`, pairKey: `s${stageNum}_pair_${idx}`, image: img };
      doubled.push(def);
      doubled.push({ ...def, id: `s${stageNum}_c${idx}-copy` });
    });

    const finalDeck = shuffle(doubled);
    const initial: CardState[] = finalDeck.map((card, index) => ({
      key: `${card.id}-${index}`,
      card,
      flipped: false,
      matched: false,
    }));

    setCurrentCards(initial);
    setFirstIndex(null);
    setLocked(false);
  }, []);

  // 开局拉取卡池并预加载
  useEffect(() => {
    let isMounted = true;
    setIsLoadingPool(true);

    (async () => {
      let fetchedCards: string[] = [];
      try {
        const url = resolveMinigameAsset('minigames/memory/cards.json');
        const res = await fetch(url);
        if (res.ok) {
          const json = await res.json();
          if (Array.isArray(json.cards) && json.cards.length > 0) fetchedCards = json.cards;
        }
      } catch (e) {}

      if (!isMounted) return;

      if (fetchedCards.length === 0) {
        fetchedCards = ['card_a.png', 'card_b.png', 'card_c.png', 'card_d.png', 'card_e.png', 'card_f.png'];
      }
      
      setAllCardsPool(fetchedCards);

      // 预加载前 8 张卡（防白屏）
      const backImg = level.cardBack || 'card_back.png';
      const urlsToPreload = fetchedCards.slice(0, 8).map(img => 
        resolveMinigameAsset(assetFolder ? `${assetFolder}/${img}` : img)
      );
      urlsToPreload.push(resolveMinigameAsset(assetFolder ? `${assetFolder}/${backImg}` : backImg));
      
      await Promise.all(urlsToPreload.map(url => Image.prefetch(url).catch(() => {})));

      if (!isMounted) return;

      buildStageDeck(1, fetchedCards);
      setStage(1);
      setIsLoadingPool(false);
    })();

    return () => { isMounted = false; };
  }, [level, assetFolder, buildStageDeck]);

  // 倒计时逻辑
  useEffect(() => {
    if (isLoadingPool || isTransitioning) return;
    const timer = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) { clearInterval(timer); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isLoadingPool, isTransitioning]);

  // 超时结束游戏
  useEffect(() => {
    if (remainingSeconds === 0 && !isLoadingPool && !isTransitioning) {
      onComplete({
        minigameId,
        levelId: level.id,
        engine: 'memory',
        result: 'victory', // 坚持到了时间结束，算通关
        score,
        maxCombo: stage,   // 用到达的关卡数当作连击
        durationMs: (level.timeLimitSeconds || 60) * 1000,
        moodGain: level.moodGain,
        coinReward: level.coinReward,
        energyCost: level.energyCost,
      });
    }
  }, [remainingSeconds, isLoadingPool, isTransitioning, onComplete, score, stage, level, minigameId]);

  // 翻牌逻辑
  const handleFlip = (index: number) => {
    if (locked || isLoadingPool || isTransitioning) return;
    const target = currentCards[index];
    if (!target || target.flipped || target.matched) return;

    const nextCards = currentCards.slice();
    nextCards[index] = { ...target, flipped: true };
    setCurrentCards(nextCards);

    if (firstIndex === null) {
      setFirstIndex(index);
      return;
    }

    setLocked(true);
    const firstCard = currentCards[firstIndex];

    if (firstCard && firstCard.card.pairKey === target.card.pairKey) {
      // 配对成功
      setTimeout(() => {
        const matched = nextCards.map((c, i) =>
          i === firstIndex || i === index ? { ...c, matched: true } : c,
        );
        setCurrentCards(matched);
        setScore((prev) => prev + 10 + stage * 2);
        setTotalMatches((prev) => prev + 1);
        setFirstIndex(null);
        setLocked(false);

        // 判断本关是否全清
        if (matched.every((c) => c.matched)) {
          // 奖励一点时间（+10秒）
          setRemainingSeconds((prev) => prev + 10);
          setIsTransitioning(true);
          
          // 1.5 秒后进入下一关
          setTimeout(() => {
            const nextStage = stage + 1;
            setStage(nextStage);
            buildStageDeck(nextStage, allCardsPool);
            setIsTransitioning(false);
          }, 1500);
        }
      }, 260);
    } else {
      // 配对失败
      setTimeout(() => {
        const reverted = nextCards.map((c, i) =>
          i === firstIndex || i === index ? { ...c, flipped: false } : c,
        );
        setCurrentCards(reverted);
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

  // 动态计算当前棋盘所需的容器宽度
  const currentCardSize = currentCols >= 4 ? 72 : BASE_CARD_SIZE; 
  const containerWidth = Math.min(SCREEN_WIDTH - 40, currentCols * (currentCardSize + 8));

  return (
    <View style={{ flex: 1, backgroundColor: '#0F172A' }}>
      {/* 顶部信息 */}
      <View style={{ position: 'absolute', top: 50, width: SCREEN_WIDTH, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 30, zIndex: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Ionicons name="time-outline" size={18} color="#EF4444" />
          <Text style={{ color: '#EF4444', fontSize: 18, fontWeight: '700', marginLeft: 4 }}>{remainingSeconds}s</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ color: '#38BDF8', fontSize: 18, fontWeight: '700' }}>第 {stage} 关</Text>
          <Text style={{ color: '#94A3B8', fontSize: 12 }}>分数 {score}</Text>
        </View>
      </View>

      {/* 关卡切换提示 */}
      {isTransitioning && (
        <View style={{ position: 'absolute', top: '40%', width: '100%', alignItems: 'center', zIndex: 20 }}>
          <Text style={{ color: '#F59E0B', fontSize: 32, fontWeight: '900', textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 4 }}>
            第 {stage} 关完成！+10s
          </Text>
        </View>
      )}

      {/* 卡牌区域 */}
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 40 }}>
        <View style={{ 
          flexDirection: 'row', 
          flexWrap: 'wrap', 
          justifyContent: 'center', 
          width: containerWidth,
        }}>
          {currentCards.map((card, index) => (
            <MemoryCardView
              key={card.key}
              card={card}
              assetFolder={assetFolder}
              backImage={level.cardBack || 'card_back.png'}
              width={currentCardSize}
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
          <Text style={{ color: '#EF4444', fontSize: 16, fontWeight: '700' }}>结束游戏</Text>
        </Pressable>
      </View>
    </View>
  );
}

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
