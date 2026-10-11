import { useCallback, useEffect, useState } from 'react';
import * as Keychain from 'react-native-keychain';
import { setGitHubToken, getGitHubToken } from '@/api/githubClient';
import type { GitHubCredentials } from '@/types/settings';

const SERVICE = 'com.wulili.github.token';
const ACCOUNT = 'github-pat';

export interface UseGitHubTokenResult {
  isLoading: boolean;
  hasToken: boolean;
  error: string | null;
  saveToken: (token: string) => Promise<boolean>;
  loadToken: () => Promise<string | null>;
  clearToken: () => Promise<void>;
  getCredentials: () => GitHubCredentials;
}

export function useGitHubToken(): UseGitHubTokenResult {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hasToken, setHasToken] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const creds = await Keychain.getGenericPassword({ service: SERVICE });
        if (!mounted) return;
        if (creds && creds.password) {
          setGitHubToken(creds.password);
          setHasToken(true);
        } else {
          setGitHubToken(null);
          setHasToken(false);
        }
      } catch {
        if (mounted) {
          setError('读取凭证失败');
          setHasToken(false);
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
      setGitHubToken(null);
      setHasToken(false);
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
    error,
    saveToken,
    loadToken,
    clearToken,
    getCredentials,
  };
}