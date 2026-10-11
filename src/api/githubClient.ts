import axios, { AxiosError, AxiosInstance } from 'axios';
import {
  GITHUB_ACCEPT,
  GITHUB_API_BASE,
  GITHUB_API_VERSION,
} from './githubConfig';
import type { GitHubApiError, GitHubErrorBody } from '@/types/github';

let cachedToken: string | null = null;

export function setGitHubToken(token: string | null): void {
  cachedToken = token;
}

export function getGitHubToken(): string | null {
  return cachedToken;
}

function buildHeaders(accept: string): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: accept,
    'X-GitHub-Api-Version': GITHUB_API_VERSION,
    'User-Agent': 'Wulili-App',
  };
  if (cachedToken) {
    headers.Authorization = `Bearer ${cachedToken}`;
  }
  return headers;
}

export const githubClient: AxiosInstance = axios.create({
  baseURL: GITHUB_API_BASE,
  timeout: 20000,
});

githubClient.interceptors.request.use((config) => {
  const accept =
    (config.headers?.Accept as string | undefined) ?? GITHUB_ACCEPT.json;
  const merged = buildHeaders(accept);
  config.headers = config.headers ?? {};
  for (const [key, value] of Object.entries(merged)) {
    (config.headers as Record<string, string>)[key] = value;
  }
  return config;
});

export function toGitHubApiError(error: unknown): GitHubApiError {
  const fallback: GitHubApiError = {
    status: 0,
    message: '网络请求失败，请检查网络连接',
    isRateLimit: false,
    isUnauthorized: false,
    isNotFound: false,
    raw: error,
  };

  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<GitHubErrorBody>;
    const status = axiosError.response?.status ?? 0;
    const body = axiosError.response?.data;
    const message = body?.message ?? axiosError.message;
    return {
      status,
      message: normalizeMessage(status, message),
      isRateLimit:
        status === 403 &&
        typeof message === 'string' &&
        message.toLowerCase().includes('rate limit'),
      isUnauthorized: status === 401,
      isNotFound: status === 404,
      raw: error,
    };
  }

  if (error instanceof Error) {
    return { ...fallback, message: error.message };
  }

  return fallback;
}

function normalizeMessage(status: number, message: string | undefined): string {
  switch (status) {
    case 401:
      return 'Token 无效或已过期，请重新设置';
    case 403:
      return message && message.toLowerCase().includes('rate limit')
        ? '请求过于频繁，请稍后再试'
        : '没有访问权限，请检查 Token 权限';
    case 404:
      return '资源不存在，请检查仓库或路径';
    case 409:
      return '文件冲突，请先同步后再试';
    case 422:
      return '请求内容不合法';
    case 500:
    case 502:
    case 503:
      return 'GitHub 服务暂时不可用，请稍后再试';
    default:
      return message && message.length > 0 ? message : '请求失败，请稍后再试';
  }
}

export function isGitHubApiError(value: unknown): value is GitHubApiError {
  if (typeof value !== 'object' || value === null) return false;
  return 'status' in value && 'message' in value;
}

export async function githubRequest<T>(
  method: 'get' | 'put' | 'delete' | 'post',
  url: string,
  options?: {
    params?: Record<string, unknown>;
    data?: unknown;
    accept?: string;
  },
): Promise<T> {
  const response = await githubClient.request<T>({
    method,
    url,
    params: options?.params,
    data: options?.data,
    headers: options?.accept ? { Accept: options.accept } : undefined,
  });
  return response.data;
}