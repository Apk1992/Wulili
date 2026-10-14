export type TimeOfDay = 'morning' | 'day' | 'evening' | 'night' | 'lateNight';

export type Mood =
  | 'calm'
  | 'happy'
  | 'sad'
  | 'sick'
  | 'sleepy'
  | 'annoyed'
  | 'shy';

export type IllnessType = 'none' | 'rhinitis' | 'cold' | 'fever';

export type FoodCategory = 'healthy' | 'junk';

export type ActionType =
  | 'feed'
  | 'entertain'
  | 'stream'
  | 'exercise'
  | 'medicine'
  | 'sleep'
  | 'idle';

export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

export interface FoodEffect {
  hunger: number;
  mood: number;
  health: number;
  energy: number;
  weight: number;
}

export interface Food {
  id: string;
  name: string;
  description: string;
  category: FoodCategory;
  price: number;
  image: string;
  effect: FoodEffect;
}

export interface Medicine {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  cures: IllnessType[];
  healthRestore: number;
  moodRestore: number;
}

export interface EquipmentBonus {
  moodDecayRate?: number;
  energyCostRate?: number;
  affinityGain?: number;
  streamIncomeRate?: number;
  moodRecoveryRate?: number;
  illnessResistance?: number;
  sleepRecoveryRate?: number;
}

export interface Outfit {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  moodBonus: number;
  affinityBonus: number;
  bonus?: EquipmentBonus;
}

export interface Accessory {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  moodBonus: number;
  affinityBonus: number;
  bonus?: EquipmentBonus;
}

export interface ExerciseOption {
  id: string;
  name: string;
  description: string;
  icon: string;
  durationMinutes: number;
  energyCost: number;
  healthGain: number;
  weightLoss: number;
  moodEffect: number;
}

export interface IllnessState {
  type: IllnessType;
  since: number | null;
  severity: number;
}

export interface WuliliStats {
  hunger: number;
  mood: number;
  health: number;
  energy: number;
  weight: number;
}

export interface WuliliState {
  stats: WuliliStats;
  coins: number;
  affinity: number;
  illness: IllnessState;
  ownedOutfits: string[];
  ownedAccessories: string[];
  currentOutfit: string | null;
  currentAccessory: string | null;
  lastTickAt: number;
  lastFedAt: number | null;
  lastEntertainedAt: number | null;
  lastStreamedAt: number | null;
  lastExercisedAt: number | null;
  lastMedicineAt: number | null;
  lastSleptAt: number | null;
  lastInteractionAt: number | null;
  totalStreamEarnings: number;
  totalStreamSeconds: number;
  totalSleepSeconds: number;
  consecutiveJunkFood: number;
  consecutiveHealthyFood: number;
  consecutiveDaysLoggedIn: number;
  lastLoginDate: string | null;
  createdAt: number;
}

export interface ActionFeedback {
  action: ActionType;
  deltaStats: Partial<WuliliStats>;
  deltaCoins: number;
  deltaAffinity: number;
  message: string;
  triggeredIllness: IllnessType | null;
}

export const STAT_LIMITS = {
  hunger: { min: 0, max: 100 },
  mood: { min: 0, max: 100 },
  health: { min: 0, max: 100 },
  energy: { min: 0, max: 100 },
  weight: { min: 30, max: 120 },
} as const;

export const INITIAL_WULILI_STATE: WuliliState = {
  stats: {
    hunger: 80,
    mood: 75,
    health: 90,
    energy: 85,
    weight: 52,
  },
  coins: 100,
  affinity: 10,
  illness: {
    type: 'none',
    since: null,
    severity: 0,
  },
  ownedOutfits: ['casual_tee'],
  ownedAccessories: [],
  currentOutfit: 'casual_tee',
  currentAccessory: null,
  lastTickAt: Date.now(),
  lastFedAt: null,
  lastEntertainedAt: null,
  lastStreamedAt: null,
  lastExercisedAt: null,
  lastMedicineAt: null,
  lastSleptAt: null,
  lastInteractionAt: null,
  totalStreamEarnings: 0,
  totalStreamSeconds: 0,
  totalSleepSeconds: 0,
  consecutiveJunkFood: 0,
  consecutiveHealthyFood: 0,
  consecutiveDaysLoggedIn: 1,
  lastLoginDate: null,
  createdAt: Date.now(),
};