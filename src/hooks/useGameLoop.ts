// src/hooks/useGameLoop.ts
import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useWuliliStore } from '@/store/useWuliliStore';
import { useStreamStore } from '@/store/useStreamStore';
import { useSleepStore } from '@/store/useSleepStore';
import { useAppConfigStore } from '@/store/useAppConfigStore';
import { useTravelStore } from '@/store/useTravelStore';
import { HOUSES } from '@/data/houseConfig';
import { clamp } from '@/utils/random';
import { STREAM_CONFIG, computeStreamLevel, computeDurationBonus } from '@/data/streamConfig';
import { SLEEP_CONFIG } from '@/data/sleepConfig';
import { MENSTRUAL_CONFIG } from '@/data/menstrualConfig';
import { aggregateBonus } from '@/utils/equipmentBonus';
import { STRESS_START_DAYS, STRESS_MAX_DAYS } from '@/data/travelConfig';

const TICK_INTERVAL_MS = 5000;
const ONE_MONTH_MS = 30 * 24 * 60 * 60 * 1000;

export interface UseGameLoopResult {
  isRunning: boolean;
}

function isInPeriod(): boolean {
  const w = useWuliliStore.getState().state;
  const m = w.menstrual;
  if (!m.cycleStartAt) return false;
  const dayInCycle = Math.floor((Date.now() - m.cycleStartAt) / (24 * 60 * 60 * 1000)) + 1;
  return dayInCycle >= 1 && dayInCycle <= MENSTRUAL_CONFIG.periodDays;
}

function getMenstrualPenalty(): number {
  if (!isInPeriod()) return 0;
  const m = useWuliliStore.getState().state.menstrual;
  const medicineActive = m.medicineExpireAt !== null && Date.now() < m.medicineExpireAt;
  return medicineActive ? 0.3 : 1.0;
}

export function useGameLoop(): UseGameLoopResult {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const runningRef = useRef<boolean>(false);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const rentLockRef = useRef<boolean>(false);

  useEffect(() => {
    AsyncStorage.getItem('@wulili/install_date').then((val) => {
      if (!val) AsyncStorage.setItem('@wulili/install_date', Date.now().toString());
    });

    const checkMonthlyRent = async () => {
      if (rentLockRef.current) return;
      rentLockRef.current = true;
      try {
        const now = Date.now();
        const installDateStr = await AsyncStorage.getItem('@wulili/install_date');
        const installDate = installDateStr ? parseInt(installDateStr, 10) : now;
        const lastRentDateStr = await AsyncStorage.getItem('@wulili/last_rent_date');
        const lastRentTime = lastRentDateStr ? parseInt(lastRentDateStr, 10) : installDate;

        if (now - lastRentTime < ONE_MONTH_MS) return;

        const wuliliStore = useWuliliStore.getState();
        const houseId = wuliliStore.state.currentHouseId || 'default_room';
        const house = HOUSES.find((h) => h.id === houseId) || HOUSES[0];
        const rentPrice = house.rentPrice;
        const currentCoins = wuliliStore.state.coins;

        await AsyncStorage.setItem('@wulili/last_rent_date', now.toString());
        wuliliStore.addCoins(-rentPrice);

        const remainingCoins = currentCoins - rentPrice;
        let msg = '';

        if (remainingCoins < 0) {
          msg = '房东来收租了……可是我们的钱不够，对不起，让你跟着我受苦了。';
          wuliliStore.addStats({ mood: -20 });
        } else if (remainingCoins === 0) {
          msg = '刚好交完房租……接下来我们要精打细算每一顿饭了。';
          wuliliStore.addStats({ mood: -10 });
        } else if (remainingCoins <= rentPrice) {
          msg = '房租交上了，不过剩下的钱不多了，接下来要省点花哦。';
          wuliliStore.addStats({ mood: -5 });
        } else if (remainingCoins <= rentPrice * 2) {
          msg = '房租交完了！我们还有一些余钱，要不要去吃顿好的庆祝一下？';
          wuliliStore.addStats({ mood: 5 });
        } else {
          msg = '轻轻松松就交完房租啦！看来我们最近赚了不少呢，随便你想买什么都可以！';
          wuliliStore.addStats({ mood: 15 });
        }

        useWuliliStore.setState((prev) => ({
          state: { ...prev.state, lastEventMessage: msg },
        }));
      } catch (e) {
      } finally {
        rentLockRef.current = false;
      }
    };

    const checkTravelFinished = () => {
      const travelStore = useTravelStore.getState();
      const justFinished = travelStore.checkAndFinishTravel();
      if (justFinished) {
        useWuliliStore.getState().addStats({ mood: 50 });
        useWuliliStore.getState().addStats({ energy: 100 });
      }
    };

    const checkTravelStress = () => {
      const travelState = useTravelStore.getState().state;
      const now = Date.now();
      if (travelState.isTraveling) return;
      if (travelState.happyBuffEndAt && now < travelState.happyBuffEndAt) return;

      const lastTravelTime = travelState.lastTravelEndAt || 0;
      const baselineTime = lastTravelTime === 0 ? 0 : lastTravelTime;
      if (baselineTime === 0) return;

      const daysSinceLastTravel = (now - baselineTime) / (24 * 3600 * 1000);
      if (daysSinceLastTravel > STRESS_MAX_DAYS) {
        useWuliliStore.getState().addStats({ mood: -0.1 });
      } else if (daysSinceLastTravel > STRESS_START_DAYS) {
        useWuliliStore.getState().addStats({ mood: -0.05 });
      }
    };

    const getBonus = () => {
      const wulili = useWuliliStore.getState().state;
      const cfg = useAppConfigStore.getState();
      const outfit = wulili.currentOutfit ? cfg.getOutfitById(wulili.currentOutfit) : null;
      const accessory = wulili.currentAccessory ? cfg.getAccessoryById(wulili.currentAccessory) : null;
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

      const menstrualPenalty = getMenstrualPenalty();
      const streamIncomePenalty = 1 - menstrualPenalty * 0.3;
      const energyExtraCost = 1 + menstrualPenalty * 0.3;

      const earningsPerSecond = STREAM_CONFIG.baseEarningPerSecond * moodFactor * healthFactor * bonus.streamIncomeRate * levelMultiplier * durationInfo.multiplier * streamIncomePenalty;
      const energyCostPerSecond = STREAM_CONFIG.energyCostPerSecond * bonus.energyCostRate * energyExtraCost;
      const moodCostPerSecond = STREAM_CONFIG.moodCostPerSecond * bonus.moodDecayRate * (1 + menstrualPenalty * 0.5);

      streamStore.tick(
        deltaMs, earningsPerSecond, energyCostPerSecond, moodCostPerSecond,
        (energyCost, moodCost) => { useWuliliStore.getState().addStats({ energy: -energyCost, mood: -moodCost }); },
        (seconds) => { useWuliliStore.getState().addStreamSeconds(seconds); },
      );

      const afterTick = useWuliliStore.getState().state;
      if (afterTick.stats.energy < STREAM_CONFIG.autoStopEnergy || afterTick.stats.health < STREAM_CONFIG.autoStopHealth) {
        const earned = streamStore.stop();
        if (earned > 0) {
          useWuliliStore.getState().addCoins(earned);
          useWuliliStore.getState().markInteraction('stream');
        }
      }
    };

    // 🔥 暴力修复睡眠逻辑：不走 addStats，直接计算并写死
    const processSleepTick = (deltaMs: number) => {
      const sleepStore = useSleepStore.getState();
      const sleep = sleepStore.state;
      if (!sleep.isSleeping) return;

      // 设定恢复速率（每小时恢复 15 点精力，约 7 小时回满）
      const energyPerHour = 15; 
      const moodPerHour = 10;
      const healthPerHour = 8;

      const hoursPassed = deltaMs / (3600 * 1000);
      const energyGain = energyPerHour * hoursPassed;
      const moodGain = moodPerHour * hoursPassed;
      const healthGain = healthPerHour * hoursPassed;

      // 强制加精力，忽略任何衣服折扣
      useWuliliStore.setState((prev) => {
        const s = prev.state.stats;
        return {
          state: {
            ...prev.state,
            stats: {
              ...s,
              energy: Math.min(100, s.energy + energyGain),
              mood: Math.min(100, s.mood + moodGain),
              health: Math.min(100, s.health + healthGain),
            },
          },
        };
      });

      // 累加睡眠时长
      sleepStore.tick(
        deltaMs,
        { energy: 0, mood: 0, health: 0 }, 
        () => {}, 
        (seconds) => useWuliliStore.getState().addSleepSeconds(seconds),
      );

      const afterTick = useWuliliStore.getState().state;
      const totalHours = (sleep.totalSeconds + deltaMs / 1000) / 3600;
      
      // 精力满了 或者 睡满 24 小时，自动醒
      if (afterTick.stats.energy >= 100 || totalHours >= 24) {
        sleepStore.stop();
        useWuliliStore.getState().markInteraction('sleep');
      }
    };

    const tick = () => {
      if (!runningRef.current) return;
      try {
        checkTravelFinished();
        void checkMonthlyRent();
        checkTravelStress();

        const wuliliStore = useWuliliStore.getState();
        wuliliStore.applyTimeDecay();
        processStreamTick(TICK_INTERVAL_MS);
        processSleepTick(TICK_INTERVAL_MS);
      } catch {}
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
      if (nextState === 'active' && (prev === 'background' || prev === 'inactive')) {
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
      } else if (nextState === 'background' || nextState === 'inactive') {
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
