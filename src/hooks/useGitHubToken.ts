import { useCallback, useEffect, useState } from 'react';
import * as Keychain from 'react-native-keychain';
import {
  setGitHubToken,
  getGitHubToken,
  hasEmbeddedToken,
} from '@/api/githubClient';
import { EMBEDDED_GH_TOKEN } from '@/config/embedded';
import type { GitHubCredentials } from '@/types/settings';

const SERVICE = 'com.wulili.github.token';
const ACCOUNT = 'github-pat';
const PLACEHOLDER = '__WULILI_GH_TOKEN__';

function readEmbeddedToken(): string | null {
  if (typeof EMBEDDED_GH_TOKEN !== 'string') return null;
  const trimmed = EMBEDDED_GH_TOKEN.trim();
  if (trimmed.length === 0 || trimmed === PLACEHOLDER) return null;
  return trimmed;
}

export interface UseGitHubTokenResult {
  isLoading: boolean;
  hasToken: boolean;
  hasEmbedded: boolean;
  error: string | null;
  saveToken: (token: string) => Promise<boolean>;
  loadToken: () => Promise<string | null>;
  clearToken: () => Promise<void>;
  getCredentials: () => GitHubCredentials;
}

export function useGitHubToken(): UseGitHubTokenResult {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hasToken, setHasToken] = useState<boolean>(false);
  const [hasEmbedded, setHasEmbedded] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      // 1. 先检查 embedded
      const embedded = readEmbeddedToken();
      if (embedded) {
        setGitHubToken(embedded);
        if (mounted) {
          setHasEmbedded(true);
          setHasToken(true);
        }
      }

      // 2. 再看 keychain
      try {
        const creds = await Keychain.getGenericPassword({ service: SERVICE });
        if (!mounted) return;
        if (creds && creds.password && creds.password.length > 0) {
          // keychain 有值 → 用它（用户主动输入，优先级最高）
          setGitHubToken(creds.password);
          setHasToken(true);
        } else if (!embedded) {
          // keychain 没值 + embedded 也没值 → 明确为 null
          setGitHubToken(null);
          setHasToken(false);
        }
        // 关键：如果 embedded 有值但 keychain 没值 → 什么都不做，
        // 保持 embedded 的 token
      } catch {
        if (mounted && !embedded) {
          setError('读取凭证失败');
        }
      } finally {
        if (mounted) setIsLoading(false);
      }
    };
    void load();
    return () => {
      mounted = false;
    };
  }, []);

  const saveToken = useCallback(async (token: string): Promise<boolean> => {
    const trimmed = token.trim();
    if (trimmed.length === 0) {
      setError('Token 不能为空');
      return false;
    }
    try {
      await Keychain.setGenericPassword(ACCOUNT, trimmed, { service: SERVICE });
      setGitHubToken(trimmed);
      setHasToken(true);
      setError(null);
      return true;
    } catch {
      setError('保存 Token 失败');
      return false;
    }
  }, []);

  const loadToken = useCallback(async (): Promise<string | null> => {
    // 优先 embedded
    const embedded = readEmbeddedToken();
    if (embedded) {
      setGitHubToken(embedded);
      return embedded;
    }
    try {
      const creds = await Keychain.getGenericPassword({ service: SERVICE });
      if (creds && creds.password) {
        setGitHubToken(creds.password);
        return creds.password;
      }
      return null;
    } catch {
      setError('读取 Token 失败');
      return null;
    }
  }, []);

  const clearToken = useCallback(async (): Promise<void> => {
    try {
      await Keychain.resetGenericPassword({ service: SERVICE });
      // 清掉 keychain 后，如果 embedded 存在，恢复 embedded
      const embedded = readEmbeddedToken();
      if (embedded) {
        setGitHubToken(embedded);
        setHasToken(true);
      } else {
        setGitHubToken(null);
        setHasToken(false);
      }
      setError(null);
    } catch {
      setError('清除 Token 失败');
    }
  }, []);

  const getCredentials = useCallback((): GitHubCredentials => {
    return {
      token: getGitHubToken(),
      hasToken,
      savedAt: hasToken ? Date.now() : null,
    };
  }, [hasToken]);

  return {
    isLoading,
    hasToken,
    hasEmbedded,
    error,
    saveToken,
    loadToken,
    clearToken,
    getCredentials,
  };
}