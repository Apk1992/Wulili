// src/types/navigation.ts
import type { NavigatorScreenParams } from '@react-navigation/native';

export type TabParamList = {
  Wulili: undefined;
  Memory: undefined;
};

export type RootStackParamList = {
  Tabs: NavigatorScreenParams<TabParamList>;
  Feed: undefined;
  FoodDetail: {
    foodId: string;
  };
  Entertain: undefined;
  Album: undefined;
  Stream: undefined;
  Exercise: undefined;
  Medicine: undefined;
  MedicineDetail: {
    medicineId: string;
  };
  Shop: undefined;
  ItemDetail: {
    itemId: string;
    kind: 'outfit' | 'accessory';
  };
  Status: undefined;
  MusicPlayer: { initialPath?: string } | undefined;
  VideoPlayer: { initialPath?: string } | undefined;
  NoteReader: {
    path: string;
    sha: string;
    displayName: string;
  };
  Settings: undefined;
  GitHubToken: undefined;
  About: undefined;
  DeveloperConsole: undefined;
  DialogueEditor: undefined;
  FoodEditor: undefined;
  MedicineEditor: undefined;
  OutfitEditor: undefined;
  AccessoryEditor: undefined;
  MinigameEditor: undefined;
  MemoryManager: undefined;
  R2Config: undefined; // 🔥 新增 R2 配置页面
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
