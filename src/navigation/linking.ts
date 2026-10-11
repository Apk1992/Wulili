import type { LinkingOptions } from '@react-navigation/native';
import type { RootStackParamList } from '@/types/navigation';

export const linking: LinkingOptions<RootStackParamList> = {
  prefixes: ['wulili://', 'https://wulili.app'],
  config: {
    screens: {
      Tabs: {
        screens: {
          Wulili: 'wulili',
          Memory: 'memory',
        },
      },
      Feed: 'feed',
      Entertain: 'entertain',
      Stream: 'stream',
      Exercise: 'exercise',
      Medicine: 'medicine',
      Shop: 'shop',
      MusicPlayer: 'music',
      VideoPlayer: 'video',
      NoteReader: 'note/:path',
      Settings: 'settings',
      GitHubToken: 'settings/token',
      About: 'about',
      DeveloperConsole: 'dev',
      DialogueEditor: 'dev/dialogues',
      FoodEditor: 'dev/food',
      MedicineEditor: 'dev/medicine',
      OutfitEditor: 'dev/outfits',
      AccessoryEditor: 'dev/accessories',
      MinigameEditor: 'dev/minigames',
      MemoryManager: 'dev/memory',
    },
  },
};

export default linking;