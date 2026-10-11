import { create } from 'zustand';
import { useWuliliStore } from './useWuliliStore';
import { useAppConfigStore } from './useAppConfigStore';
import { storageGet, storageSet } from '@/utils/storage';

const STORAGE_KEY = '@wulili/shop-history';

export interface PurchaseRecord {
  id: string;
  itemType: 'food' | 'medicine' | 'outfit' | 'accessory';
  itemId: string;
  price: number;
  purchasedAt: number;
}

interface ShopStore {
  history: PurchaseRecord[];
  hydrated: boolean;
  hydrate: () => Promise<void>;
  canAfford: (price: number) => boolean;
  buyFood: (foodId: string, quantity?: number) => boolean;
  buyMedicine: (medicineId: string, quantity?: number) => boolean;
  buyOutfit: (outfitId: string) => boolean;
  buyAccessory: (accessoryId: string) => boolean;
  clearHistory: () => void;
  getTotalSpent: () => number;
}

export const useShopStore = create<ShopStore>((set, get) => ({
  history: [],
  hydrated: false,

  hydrate: async () => {
    const stored = await storageGet<PurchaseRecord[]>(STORAGE_KEY);
    set({ history: Array.isArray(stored) ? stored : [], hydrated: true });
  },

  canAfford: (price) => {
    const coins = useWuliliStore.getState().state.coins;
    return coins >= price;
  },

  buyFood: (foodId, quantity = 1) => {
    const cfg = useAppConfigStore.getState();
    const food = cfg.getFoodById(foodId);
    if (!food) return false;
    const total = food.price * quantity;
    if (!get().canAfford(total)) return false;

    useWuliliStore.getState().addCoins(-total);
    const { useInventoryStore } = require('./useInventoryStore');
    useInventoryStore.getState().addFood(foodId, quantity);

    const record: PurchaseRecord = {
      id: `${foodId}-${Date.now()}`,
      itemType: 'food',
      itemId: foodId,
      price: total,
      purchasedAt: Date.now(),
    };
    const history = [record, ...get().history].slice(0, 200);
    set({ history });
    void storageSet(STORAGE_KEY, history);
    return true;
  },

  buyMedicine: (medicineId, quantity = 1) => {
    const cfg = useAppConfigStore.getState();
    const med = cfg.getMedicineById(medicineId);
    if (!med) return false;
    const total = med.price * quantity;
    if (!get().canAfford(total)) return false;

    useWuliliStore.getState().addCoins(-total);
    const { useInventoryStore } = require('./useInventoryStore');
    useInventoryStore.getState().addMedicine(medicineId, quantity);

    const record: PurchaseRecord = {
      id: `${medicineId}-${Date.now()}`,
      itemType: 'medicine',
      itemId: medicineId,
      price: total,
      purchasedAt: Date.now(),
    };
    const history = [record, ...get().history].slice(0, 200);
    set({ history });
    void storageSet(STORAGE_KEY, history);
    return true;
  },

  buyOutfit: (outfitId) => {
    const cfg = useAppConfigStore.getState();
    const outfit = cfg.getOutfitById(outfitId);
    if (!outfit) return false;
    const wulili = useWuliliStore.getState();
    if (wulili.state.ownedOutfits.includes(outfitId)) return false;
    if (!get().canAfford(outfit.price)) return false;

    wulili.addCoins(-outfit.price);
    wulili.ownOutfit(outfitId);

    const record: PurchaseRecord = {
      id: `${outfitId}-${Date.now()}`,
      itemType: 'outfit',
      itemId: outfitId,
      price: outfit.price,
      purchasedAt: Date.now(),
    };
    const history = [record, ...get().history].slice(0, 200);
    set({ history });
    void storageSet(STORAGE_KEY, history);
    return true;
  },

  buyAccessory: (accessoryId) => {
    const cfg = useAppConfigStore.getState();
    const accessory = cfg.getAccessoryById(accessoryId);
    if (!accessory) return false;
    const wulili = useWuliliStore.getState();
    if (wulili.state.ownedAccessories.includes(accessoryId)) return false;
    if (!get().canAfford(accessory.price)) return false;

    wulili.addCoins(-accessory.price);
    wulili.ownAccessory(accessoryId);

    const record: PurchaseRecord = {
      id: `${accessoryId}-${Date.now()}`,
      itemType: 'accessory',
      itemId: accessoryId,
      price: accessory.price,
      purchasedAt: Date.now(),
    };
    const history = [record, ...get().history].slice(0, 200);
    set({ history });
    void storageSet(STORAGE_KEY, history);
    return true;
  },

  clearHistory: () => {
    set({ history: [] });
    void storageSet(STORAGE_KEY, []);
  },

  getTotalSpent: () =>
    get().history.reduce((sum, record) => sum + record.price, 0),
}));