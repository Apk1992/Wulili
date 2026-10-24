// src/store/useTravelStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TRAVEL_DESTINATIONS, TravelDestination } from '@/data/travelConfig';

export const TRAVEL_HAPPY_BUFF_HOURS = 48; // 旅游回来后，48 小时内心情极好

interface TravelState {
  isTraveling: boolean;
  destinationId: string | null;
  startedAt: number | null;
  endAt: number | null;
  unlockedSpots: string[];
  happyBuffEndAt: number | null; // 🔥 好心情 Buff 截止时间
}

interface TravelStore {
  state: TravelState;
  startTravel: (dest: TravelDestination) => void;
  finishTravel: () => void;
  isSpotUnlocked: (spotId: string) => boolean;
  checkAndFinishTravel: () => boolean; // 检查是否该结束旅游了
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
        if (!destinationId) return;
        
        const dest = TRAVEL_DESTINATIONS.find((d) => d.id === destinationId);
        const newSpots = dest ? dest.spots.map(s => s.id) : [];
        
        set({
          state: {
            ...get().state,
            isTraveling: false,
            destinationId: null,
            startedAt: null,
            endAt: null,
            unlockedSpots: Array.from(new Set([...unlockedSpots, ...newSpots])),
            happyBuffEndAt: Date.now() + TRAVEL_HAPPY_BUFF_HOURS * 3600 * 1000, // 🔥 开始 Buff
          },
        });
      },
      isSpotUnlocked: (spotId) => get().state.unlockedSpots.includes(spotId),
      checkAndFinishTravel: () => {
        const s = get().state;
        if (!s.isTraveling || !s.endAt) return false;
        
        // 如果时间到了
        if (Date.now() >= s.endAt) {
          get().finishTravel();
          return true; // 告诉调用者：刚刚旅游结束了
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
