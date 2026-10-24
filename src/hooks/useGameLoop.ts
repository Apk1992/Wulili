// src/hooks/useGameLoop.ts
import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useWuliliStore } from '@/store/useWuliliStore';
import { useStreamStore } from '@/store/useStreamStore';
import { useSleepStore } from '@/store/useSleepStore';
import { useAppConfigStore } from '@/store/useAppConfigStore';
import { useTravelStore } from '@/store/useTravelStore';
import { clamp } from '@/utils/random';
import {
  STREAM_CONFIG,
  computeStreamLevel,
  computeDurationBonus,
} from '@/data/streamConfig';
import { SLEEP_CONFIG } from '@/data/sleepConfig';
import { MENSTRUAL_CONFIG } from '@/data/menstrualConfig';
import { aggregateBonus } from '@/utils/equipmentBonus';
import { STRESS_START_DAYS, STRESS_MAX_DAYS } from '@/data/travelConfig';

const TICK_INTERVAL_MS = 5000;
const DAILY_RENT = 50;

export interface UseGameLoopResult {
  isRunning: boolean;
}

function isInPeriod(): boolean {
  const w = useWuliliStore.getState().state;
  const m = w.menstrual;
  if (!m.cycleStartAt) return false;
  const dayInCycle =
    Math.floor((Date.now() - m.cycleStartAt) / (24 * 60 * 60 * 1000)) + 1;
  return dayInCycle >= 1 && dayInCycle <= MENSTRUAL_CONFIG.periodDays;
}

function getMenstrualPenalty(): number {
  if (!isInPeriod()) return 0;
  const m = useWuliliStore.getState().state.menstrual;
  const medicineActive =
    m.medicineExpireAt !== null && Date.now() < m.medicineExpireAt;
  return medicineActive ? 0.3 : 1.0;
}

export function useGameLoop(): UseGameLoopResult {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const runningRef = useRef<boolean>(false);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const lastRentCheckRef = useRef<string>(new Date().toDateString());

  useEffect(() => {
    // 初始化安装日期（首日免扣费）
    AsyncStorage.getItem('@wulili/install_date').then((val) => {
      if (!val) AsyncStorage.setItem('@wulili/install_date', Date.now().toString());
    });

    // 每日扣费
    const checkDailyRent = async () => {
      const todayStr = new Date().toDateString();
      if (lastRentCheckRef.current === todayStr) return;
      lastRentCheckRef.current = todayStr;

      const installDateStr = await AsyncStorage.getItem('@wulili/install_date');
      const installDate = installDateStr ? parseInt(installDateStr, 10) : Date.now();

      if (new Date(installDate).toDateString() === todayStr) return; // 首日不扣

      const lastRentDate = await AsyncStorage.getItem('@wulili/last_rent_date');
      if (lastRentDate === todayStr) return;

      const wuliliStore = useWuliliStore.getState();
      const currentCoins = wuliliStore.state.coins;

      wuliliStore.addCoins(-DAILY_RENT);
      await AsyncStorage.setItem('@wulili/last_rent_date', todayStr);

      if (currentCoins >= DAILY_RENT) {
        wuliliStore.addStats({ mood: -2 });
      } else {
        wuliliStore.addStats({ mood: -15 });
      }
    };

    // 检查旅游结束
    const checkTravelFinished = () => {
      const travelStore = useTravelStore.getState();
      const justFinished = travelStore.checkAndFinishTravel();
      if (justFinished) {
        // 旅游刚结束，瞬间恢复 50 心情、100 精力
        useWuliliStore.getState().addStats({ mood: 50 });
        useWuliliStore.getState().addStats({ energy: 100 });
      }
    };

    // 检查旅游压力
    const checkTravelStress = () => {
      const travelState = useTravelStore.getState().state;
      const now = Date.now();
      
      // 如果正在旅游，没有压力惩罚
      if (travelState.isTraveling) return;
      
      // 如果在 Buff 期间，没有压力
      if (travelState.happyBuffEndAt && now < travelState.happyBuffEndAt) return;

      // 计算距离上次旅游的天数
      const lastTravelTime = travelState.lastTravelEndAt || 0;
      // 如果从未旅游过，用安装日期，避免新玩家一上来就暴躁
      const installDateStr = AsyncStorage.getItem('@wulili/install_date') as any; 
      // AsyncStorage 取值是异步的，这里为了简化，如果在 App 运行中，不可能没被赋值。
      // 安全起见，用 lastTravelEndAt 或 0 处理。
      
      const baselineTime = lastTravelTime === 0 ? 0 : lastTravelTime;
      const daysSinceLastTravel = baselineTime === 0 ? 0 : (now - baselineTime) / (24 * 3600 * 1000);

      // 如果从未旅游过，按 0 天算（不惩罚）
      if (baselineTime === 0) return;

      if (daysSinceLastTravel > STRESS_MAX_DAYS) {
        // 极度压抑：每 5 秒额外扣 0.1 心情
        useWuliliStore.getState().addStats({ mood: -0.1 });
      } else if (daysSinceLastTravel > STRESS_START_DAYS) {
        // 开始有压力：每 5 秒额外扣 0.05 心情
        useWuliliStore.getState().addStats({ mood: -0.05 });
      }
    };

    // 应用旅游 Buff 对心情衰减的影响
    const applyTravelMoodBuff = () => {
      const travelState = useTravelStore.getState().state;
      const now = Date.now();
      
      // 🔥 如果处于旅游好心情 Buff 期间，降低基础心情消耗
      // （因为 applyTimeDecay 已经扣了基础心情，我们在这里稍微补回来一点，或者额外减少）
      // 为了不影响 applyTimeDecay 的底层逻辑，我们采用“补偿法”：
      if (travelState.happyBuffEndAt && now < travelState.happyBuffEndAt) {
        // 每天旅游 Buff 期间，每 5 秒增加 0.02 心情（抵消部分衰减）
        useWuliliStore.getState().addStats({ mood: 0.02 });
      }
    };

    const getBonus = () => {
      const wulili = useWuliliStore.getState().state;
      const cfg = useAppConfigStore.getState();
      const outfit = wulili.currentOutfit
        ? cfg.getOutfitById(wulili.currentOutfit)
        : null;
      const accessory = wulili.currentAccessory
        ? cfg.getAccessoryById(wulili.currentAccessory)
        : null;
      return aggregateBonus(outfit, accessory);
    };

    const processStreamTick = (deltaMs: number) => {
      const streamStore = useStreamStore.getState();
      const stream = streamStore.state;
      if (!stream.isStreaming) return;

      const wulili = useWuliliStore.getState().state;
      const bonus = getBonus();
      const levelInfo = computeStreamLevel(wulili.totalStreamSeconds);
      const levelMultiplier = 1 + levelInfo.bonusRate;
      const durationInfo = computeDurationBonus(stream.totalSeconds);

      const moodFactor = clamp(wulili.stats.mood / 100, 0.2, 1);
      const healthFactor = clamp(wulili.stats.health / 100, 0.3, 1);

      // 经期惩罚
      const menstrualPenalty = getMenstrualPenalty();
      const streamIncomePenalty = 1 - menstrualPenalty * 0.3;
      const energyExtraCost = 1 + menstrualPenalty * 0.3;

      const earningsPerSecond =
        STREAM_CONFIG.baseEarningPerSecond *
        moodFactor *
        healthFactor *
        bonus.streamIncomeRate *
        levelMultiplier *
        durationInfo.multiplier *
        streamIncomePenalty;

      const energyCostPerSecond =
        STREAM_CONFIG.energyCostPerSecond *
        bonus.energyCostRate *
        energyExtraCost;
      const moodCostPerSecond =
        STREAM_CONFIG.moodCostPerSecond *
        bonus.moodDecayRate *
        (1 + menstrualPenalty * 0.5);

      streamStore.tick(
        deltaMs,
        earningsPerSecond,
        energyCostPerSecond,
        moodCostPerSecond,
        (energyCost, moodCost) => {
          useWuliliStore.getState().addStats({
            energy: -energyCost,
            mood: -moodCost,
          });
        },
        (seconds) => {
          useWuliliStore.getState().addStreamSeconds(seconds);
        },
      );

      const afterTick = useWuliliStore.getState().state;
      if (
        afterTick.stats.energy < STREAM_CONFIG.autoStopEnergy ||
        afterTick.stats.health < STREAM_CONFIG.autoStopHealth
      ) {
        const earned = streamStore.stop();
        if (earned > 0) {
          useWuliliStore.getState().addCoins(earned);
          useWuliliStore.getState().markInteraction('stream');
        }
      }
    };

    const processSleepTick = (deltaMs: number) => {
      const sleepStore = useSleepStore.getState();
      const sleep = sleepStore.state;
      if (!sleep.isSleeping) return;

      const bonus = getBonus();
      let recoveryMultiplier = bonus.sleepRecoveryRate ?? 1;

      // 经期惩罚：恢复慢
      const menstrualPenalty = getMenstrualPenalty();
      recoveryMultiplier *= 1 - menstrualPenalty * 0.4;

      const energyPerSec =
        (SLEEP_CONFIG.energyRecoveryPerHour / 3600) * recoveryMultiplier;
      const moodPerSec =
        (SLEEP_CONFIG.moodRecoveryPerHour / 3600) * recoveryMultiplier;
      const healthPerSec =
        (SLEEP_CONFIG.healthRecoveryPerHour / 3600) * recoveryMultiplier;

      sleepStore.tick(
        deltaMs,
        { energy: energyPerSec, mood: moodPerSec, health: healthPerSec },
        (energyGain, moodGain, healthGain) => {
          useWuliliStore.getState().addStats({
            energy: energyGain,
            mood: moodGain,
            health: healthGain,
          });
        },
        (seconds) => {
          useWuliliStore.getState().addSleepSeconds(seconds);
        },
      );

      const afterTick = useWuliliStore.getState().state;
      const totalHours = (sleep.totalSeconds + deltaMs / 1000) / 3600;
      if (
        afterTick.stats.energy >= SLEEP_CONFIG.autoWakeEnergy ||
        totalHours >= SLEEP_CONFIG.maxSleepHours
      ) {
        sleepStore.stop();
        useWuliliStore.getState().markInteraction('sleep');
      }
    };

    const tick = () => {
      if (!runningRef.current) return;
      try {
        checkTravelFinished();
        void checkDailyRent();
        checkTravelStress();
        applyTravelMoodBuff();

        const wuliliStore = useWuliliStore.getState();
        wuliliStore.applyTimeDecay();
        processStreamTick(TICK_INTERVAL_MS);
        processSleepTick(TICK_INTERVAL_MS);
      } catch {
        // ignore
      }
    };

    const start = () => {
      if (runningRef.current) return;
      runningRef.current = true;
      tick();
      intervalRef.current = setInterval(tick, TICK_INTERVAL_MS);
    };

    const stop = () => {
      runningRef.current = false;
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };

    start();

    const subscription = AppState.addEventListener('change', (nextState) => {
      const prev = appStateRef.current;
      appStateRef.current = nextState;
      if (
        nextState === 'active' &&
        (prev === 'background' || prev === 'inactive')
      ) {
        const streamStore = useStreamStore.getState();
        const stream = streamStore.state;
        if (stream.isStreaming && stream.lastTickAt) {
          const elapsedMs = Date.now() - stream.lastTickAt;
          if (elapsedMs > 1000) {
            const cappedMs = Math.min(
              elapsedMs,
              STREAM_CONFIG.maxOfflineSeconds * 1000,
            );
            processStreamTick(cappedMs);
          }
        }

        const sleepStore = useSleepStore.getState();
        const sleep = sleepStore.state;
        if (sleep.isSleeping && sleep.lastTickAt) {
          const elapsedMs = Date.now() - sleep.lastTickAt;
          if (elapsedMs > 1000) {
            const cappedMs = Math.min(
              elapsedMs,
              SLEEP_CONFIG.maxOfflineSeconds * 1000,
            );
            processSleepTick(cappedMs);
          }
        }

        tick();
        start();
      } else if (
        nextState === 'background' ||
        nextState === 'inactive'
      ) {
        stop();
      }
    });

    return () => {
      stop();
      subscription.remove();
    };
  }, []);

  return { isRunning: runningRef.current };
}
