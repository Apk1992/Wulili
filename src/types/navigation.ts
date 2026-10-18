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
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
