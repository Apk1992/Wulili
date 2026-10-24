// src/store/useR2Store.ts
import { create } from 'zustand';
import * as Keychain from 'react-native-keychain';

interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
}

interface R2Store {
  config: R2Config;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  saveConfig: (config: R2Config) => Promise<void>;
  clearConfig: () => Promise<void>;
}

export const useR2Store = create<R2Store>((set) => ({
  config: {
    accountId: '',
    accessKeyId: '',
    secretAccessKey: '',
    bucketName: 'wulili-assets', // 默认桶名，你可以改
  },
  hydrated: false,

  hydrate: async () => {
    try {
      const credentials = await Keychain.getGenericPassword({ service: 'wulili_r2_auth' });
      if (credentials) {
        const data = JSON.parse(credentials.password);
        set({ config: data, hydrated: true });
        return;
      }
    } catch (e) {
      console.warn('R2 配置读取失败', e);
    }
    set({ hydrated: true });
  },

  saveConfig: async (newConfig) => {
    set({ config: newConfig });
    await Keychain.setGenericPassword('r2', JSON.stringify(newConfig), {
      service: 'wulili_r2_auth',
    });
  },

  clearConfig: async () => {
    set({ config: { accountId: '', accessKeyId: '', secretAccessKey: '', bucketName: 'wulili-assets' } });
    await Keychain.resetGenericPassword({ service: 'wulili_r2_auth' });
  },
}));
