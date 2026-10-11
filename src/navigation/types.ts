import type { NavigatorScreenParams } from '@react-navigation/native';
import type { RootStackParamList, TabParamList } from '@/types/navigation';

export type { RootStackParamList, TabParamList };

export type AppTabParamList = TabParamList;

export type AppStackParamList = RootStackParamList;

export type AppNavigationParamList = RootStackParamList & {
  Tabs: NavigatorScreenParams<TabParamList>;
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}

export const ROUTES = {
  tabs: 'Tabs',
  feed: 'Feed',
  entertain: 'Entertain',
  stream: 'Stream',
  exercise: 'Exercise',
  medicine: 'Medicine',
  shop: 'Shop',
  musicPlayer: 'MusicPlayer',
  videoPlayer: 'VideoPlayer',
  noteReader: 'NoteReader',
  settings: 'Settings',
  gitHubToken: 'GitHubToken',
  about: 'About',
  developerConsole: 'DeveloperConsole',
  dialogueEditor: 'DialogueEditor',
  foodEditor: 'FoodEditor',
  medicineEditor: 'MedicineEditor',
  outfitEditor: 'OutfitEditor',
  accessoryEditor: 'AccessoryEditor',
  minigameEditor: 'MinigameEditor',
  memoryManager: 'MemoryManager',
} as const;

export const TAB_ROUTES = {
  wulili: 'Wulili',
  memory: 'Memory',
} as const;