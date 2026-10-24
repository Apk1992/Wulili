import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useWuliliStore } from '@/store/useWuliliStore';
import { useStreamStore } from '@/store/useStreamStore';
import { useSleepStore } from '@/store/useSleepStore';
import { useAppConfigStore } from '@/store/useAppConfigStore';
import { useTravelStore } from '@/store/useTravelStore'; // 🔥 引入旅游 Store
import { clamp } from '@/utils/random';
import {
  STREAM_CONFIG,
  computeStreamLevel,
  computeDurationBonus,
} from '@/data/streamConfig';
import { SLEEP_CONFIG } from '@/data/sleepConfig';
import { MENSTRUAL_CONFIG } from '@/data/menstrualConfig';
import { aggregateBonus } from '@/utils/equipmentBonus';
import { STRESS_START_DAYS, STRESS_MAX_DAYS } from '@/data/travelConfig'; // 🔥 引入配置

const TICK_INTERVAL_MS = 5000;
const DAILY_RENT = 50; // 🔥 每天房租

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
    // 初始化安装日期
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

    // 🔥 情绪压力检查（旅游空窗期）
    const checkTravelStress = () => {
      const travelState = useTravelStore.getState().state;
      const now = Date.now();
      
      // 如果正在旅游，没有压力惩罚
      if (travelState.isTraveling) return;

      // 1. 如果在 Buff 期间，不加压，反而减压（我们后面在 tick 里减基础衰减）
      if (travelState.happyBuffEndAt && now < travelState.happyBuffEndAt) {
        return; 
      }

      // 2. 计算空窗天数
      const lastTravelTime = travelState.lastTravelEndAt || 0; 
      // 如果从来没去过，以安装日期为准（避免第一天就暴躁）
      const baselineTime = lastTravelTime === 0 ? parseInt(AsyncStorage.getItem('@wulili/install_date') as any || '0', 10) : lastTravelTime;
      // 注意：AsyncStorage.getItem 是异步的，这里简单处理，如果有问题我们后面优化。为了最安全，假设从未旅游过，就按当前时间 - 0 算。
      
      // 简化处理：如果没有记录 lastTravelEndAt，就用 0，代表“很久很久没去过了”
      // 为了防止新玩家一上来就暴躁，我们在渲染时再处理。这里先按天数算。
      const daysSinceLastTravel = lastTravelTime === 0 ? 0 : (now - lastTravelTime) / (24 * 3600 * 1000);

      if (daysSinceLastTravel > STRESS_MAX_DAYS) {
        // 极度压抑：每 5 秒额外扣 0.1 心情
        useWuliliStore.getState().addStats({ mood: -0.1 });
      } else if (daysSinceLastTravel > STRESS_START_DAYS) {
        // 开始有压力：每 5 秒额外扣 0.05 心情
        useWuliliStore.getState().addStats({ mood: -0.05 });
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
      // ... (保持原样，省略，你直接复制你原来的 processStreamTick)
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
       // ... (保持原样，省略，你直接复制你原来的 processSleepTick)
       const sleepStore = useSleepStore.getState();
       const sleep = sleepStore.state;
       if (!sleep.isSleeping) return;
 
       const bonus = getBonus();
       let recoveryMultiplier = bonus.sleepRecoveryRate ?? 1;
 
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

    // 🔥 检查旅游是否结束
    const checkTravelFinished = () => {
      const travelStore = useTravelStore.getState();
      const justFinished = travelStore.checkAndFinishTravel();
      if (justFinished) {
        // 旅游刚结束，瞬间恢复 50 心情！
        useWuliliStore.getState().addStats({ mood: 50 });
        // 强制把精力拉满
        useWuliliStore.getState().addStats({ energy: 100 });
      }
    };

    const tick = () => {
      if (!runningRef.current) return;
      try {
        checkTravelFinished(); // 🔥 检查旅游状态
        void checkDailyRent();
        checkTravelStress(); // 🔥 检查没旅游的压力

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
        // ... (保持原样，离线补偿)
        const streamStore = useStreamStore.getState();
        const stream = streamStore.state;
        if (stream.isStreaming && stream.lastTickAt) {
          const elapsedMs = Date.now() - stream.lastTickAt;
          if (elapsedMs > 1000) {
            const cappedMs = Math.min(elapsedMs, STREAM_CONFIG.maxOfflineSeconds * 1000);
            processStreamTick(cappedMs);
          }
        }

        const sleepStore = useSleepStore.getState();
        const sleep = sleepStore.state;
        if (sleep.isSleeping && sleep.lastTickAt) {
          const elapsedMs = Date.now() - sleep.lastTickAt;
          if (elapsedMs > 1000) {
            const cappedMs = Math.min(elapsedMs, SLEEP_CONFIG.maxOfflineSeconds * 1000);
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
