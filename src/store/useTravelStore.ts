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
  finishTravel: () => void;
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
        if (!destinationId) return;
        
        const dest = TRAVEL_DESTINATIONS.find((d) => d.id === destinationId);
        const newSpots = dest ? dest.spots.map(s => s.id) : [];
        const now = Date.now();
        
        // 🔥 根据旅游类型决定 Buff 持续天数
        const buffConfig = dest ? TRAVEL_BUFF_CONFIG[dest.type] : { buffDays: 1 };
        const buffDays = buffConfig.buffDays;

        set({
          state: {
            ...get().state,
            isTraveling: false,
            destinationId: null,
            startedAt: null,
            endAt: null,
            unlockedSpots: Array.from(new Set([...unlockedSpots, ...newSpots])),
            happyBuffEndAt: now + buffDays * 24 * 3600 * 1000,
            lastTravelEndAt: now,
          },
        });
      },
      isSpotUnlocked: (spotId) => get().state.unlockedSpots.includes(spotId),
      checkAndFinishTravel: () => {
        const s = get().state;
        if (!s.isTraveling || !s.endAt) return false;
        
        if (Date.now() >= s.endAt) {
          get().finishTravel();
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
