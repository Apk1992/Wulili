// src/store/useTravelStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TRAVEL_DESTINATIONS, TravelDestination, TRAVEL_BUFF_CONFIG } from '@/data/travelConfig';

interface TravelState {
  isTraveling: boolean;
  destinationId: string | null;
  startedAt: number | null;
  endAt: number | null;
  unlockedSpots: string[]; 
  happyBuffEndAt: number | null; 
  lastTravelEndAt: number | null; 
}

interface TravelStore {
  state: TravelState;
  startTravel: (dest: TravelDestination) => void;
  finishTravel: () => { newSpotId: string | null };
  isSpotUnlocked: (spotId: string) => boolean;
  checkAndFinishTravel: () => boolean;
}

export const useTravelStore = create<TravelStore>()(
  persist(
    (set, get) => ({
      state: {
        isTraveling: false,
        destinationId: null,
        startedAt: null,
        endAt: null,
        unlockedSpots: [],
        happyBuffEndAt: null,
        lastTravelEndAt: null,
      },
      startTravel: (dest) => {
        const now = Date.now();
        set({
          state: {
            ...get().state,
            isTraveling: true,
            destinationId: dest.id,
            startedAt: now,
            endAt: now + dest.durationHours * 3600 * 1000,
          },
        });
      },
      finishTravel: () => {
        const { destinationId, unlockedSpots } = get().state;
        if (!destinationId) return { newSpotId: null };
        
        const dest = TRAVEL_DESTINATIONS.find((d) => d.id === destinationId);
        if (!dest) return { newSpotId: null };

        // 🔥 找出所有还没收集的照片
        const uncollectedSpots = dest.spots.filter(s => !unlockedSpots.includes(s.id));
        
        let newSpotId: string | null = null;
        
        // 🔥 如果有未收集的照片，随机抽一张
        if (uncollectedSpots.length > 0) {
          const randomIndex = Math.floor(Math.random() * uncollectedSpots.length);
          newSpotId = uncollectedSpots[randomIndex].id;
        }
        
        const now = Date.now();
        const buffConfig = TRAVEL_BUFF_CONFIG[dest.type] || { buffDays: 1 };

        set({
          state: {
            ...get().state,
            isTraveling: false,
            destinationId: null,
            startedAt: null,
            endAt: null,
            // 🔥 只添加新抽到的那一张
            unlockedSpots: newSpotId 
              ? Array.from(new Set([...unlockedSpots, newSpotId])) 
              : unlockedSpots,
            happyBuffEndAt: now + buffConfig.buffDays * 24 * 3600 * 1000,
            lastTravelEndAt: now,
          },
        });

        return { newSpotId };
      },
      isSpotUnlocked: (spotId) => get().state.unlockedSpots.includes(spotId),
      checkAndFinishTravel: () => {
        const s = get().state;
        if (!s.isTraveling || !s.endAt) return false;
        
        if (Date.now() >= s.endAt) {
          const result = get().finishTravel();
          // 这里我们可以暂时存一个全局变量，或者发个事件，告诉 UI 抽到了什么
          // 最简单的做法：存在 state 里一个 `lastTravelResult`，供 UI 读取
          set((prev) => ({
             state: {
               ...prev.state,
               // @ts-ignore 临时加个字段供 UI 弹窗使用
               lastTravelResult: result.newSpotId
             }
          }))
          return true;
        }
        return false;
      }
    }),
    {
      name: '@wulili/travel',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
