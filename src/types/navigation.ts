import type { NavigatorScreenParams } from '@react-navigation/native';

export type TabParamList = {
  Wulili: undefined;
  Memory: undefined;
};

export type RootStackParamList = {
  Tabs: NavigatorScreenParams<TabParamList>;
  Feed: undefined;
  Entertain: undefined;
  Stream: undefined;
  Exercise: undefined;
  Medicine: undefined;
  Shop: undefined;
  MusicPlayer: undefined;
  VideoPlayer: undefined;
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