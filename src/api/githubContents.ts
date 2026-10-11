import { base64Decode, base64Encode } from '@/utils/base64';
import {
  GITHUB_ACCEPT,
  GITHUB_COMMIT_AUTHOR,
  buildContentsUrl,
  buildFileHtmlUrl,
} from './githubConfig';
import { githubRequest, toGitHubApiError } from './githubClient';
import type {
  GitHubContentItem,
  GitHubDeleteResponse,
  GitHubFileResponse,
  GitHubPutResponse,
} from '@/types/github';

export async function listDirectory(path: string): Promise<GitHubContentItem[]> {
  try {
    const data = await githubRequest<GitHubContentItem[] | GitHubContentItem>(
      'get',
      buildContentsUrl(path),
      { params: { ref: undefined }, accept: GITHUB_ACCEPT.json },
    );
    if (Array.isArray(data)) return data;
    return [data];
  } catch (error) {
    throw toGitHubApiError(error);
  }
}

export async function listFilesRecursive(path: string, depth: number = 2): Promise<GitHubContentItem[]> {
  const results: GitHubContentItem[] = [];
  const queue: Array<{ path: string; level: number }> = [{ path, level: 0 }];

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) break;
    let items: GitHubContentItem[] = [];
    try {
      items = await listDirectory(current.path);
    } catch {
      continue;
    }
    for (const item of items) {
      if (item.type === 'file') {
        results.push(item);
      } else if (item.type === 'dir' && current.level < depth) {
        queue.push({ path: item.path, level: current.level + 1 });
      }
    }
  }
  return results;
}

export interface FetchedFile {
  path: string;
  sha: string;
  raw: string;
  htmlUrl: string;
  size: number;
}

export async function getFileRaw(path: string): Promise<FetchedFile> {
  try {
    const response = await fetch(buildRawUrlWithToken(path), {
      headers: buildRawHeaders(),
    });
    if (!response.ok) {
      if (response.status === 404) {
        throw { status: 404, message: '资源不存在，请检查仓库或路径', isNotFound: true };
      }
      throw { status: response.status, message: '拉取文件失败' };
    }
    const raw = await response.text();
    return {
      path,
      sha: '',
      raw,
      htmlUrl: buildFileHtmlUrl(path),
      size: raw.length,
    };
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'status' in error) {
      throw error;
    }
    throw toGitHubApiError(error);
  }
}

function buildRawUrlWithToken(path: string): string {
  const clean = path.replace(/^\/+|\/+$/g, '');
  return `https://api.github.com/repos/yukee520/Wulili_assets/contents/${clean}`;
}

function buildRawHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: GITHUB_ACCEPT.raw,
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'Wulili-App',
  };
  return headers;
}

export async function getFileJson<T>(path: string): Promise<{ data: T; sha: string }> {
  try {
    const response = await githubRequest<GitHubFileResponse | GitHubContentItem[]>(
      'get',
      buildContentsUrl(path),
      { accept: GITHUB_ACCEPT.json },
    );
    if (Array.isArray(response)) {
      throw { status: 400, message: '目标路径是目录，不是文件' };
    }
    const content = response.content ?? '';
    const decoded = content.length > 0 ? base64Decode(content.replace(/\n/g, '')) : '';
    const parsed = JSON.parse(decoded) as T;
    return { data: parsed, sha: response.sha };
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'status' in error) {
      throw error;
    }
    throw toGitHubApiError(error);
  }
}

export async function putFile(
  path: string,
  content: string,
  message: string,
  sha?: string | null,
): Promise<GitHubPutResponse> {
  try {
    const body: Record<string, unknown> = {
      message,
      content: base64Encode(content),
      committer: GITHUB_COMMIT_AUTHOR,
      author: GITHUB_COMMIT_AUTHOR,
    };
    if (sha) body.sha = sha;
    const response = await githubRequest<GitHubPutResponse>(
      'put',
      buildContentsUrl(path),
      { data: body, accept: GITHUB_ACCEPT.json },
    );
    return response;
  } catch (error) {
    throw toGitHubApiError(error);
  }
}

export async function putBinaryFile(
  path: string,
  base64Content: string,
  message: string,
  sha?: string | null,
): Promise<GitHubPutResponse> {
  try {
    const body: Record<string, unknown> = {
      message,
      content: base64Content,
      committer: GITHUB_COMMIT_AUTHOR,
      author: GITHUB_COMMIT_AUTHOR,
    };
    if (sha) body.sha = sha;
    const response = await githubRequest<GitHubPutResponse>(
      'put',
      buildContentsUrl(path),
      { data: body, accept: GITHUB_ACCEPT.json },
    );
    return response;
  } catch (error) {
    throw toGitHubApiError(error);
  }
}

export async function deleteFile(
  path: string,
  message: string,
  sha: string,
): Promise<GitHubDeleteResponse> {
  try {
    const response = await githubRequest<GitHubDeleteResponse>(
      'delete',
      buildContentsUrl(path),
      {
        data: {
          message,
          sha,
          committer: GITHUB_COMMIT_AUTHOR,
          author: GITHUB_COMMIT_AUTHOR,
        },
        accept: GITHUB_ACCEPT.json,
      },
    );
    return response;
  } catch (error) {
    throw toGitHubApiError(error);
  }
}

export async function getFileSha(path: string): Promise<string | null> {
  try {
    const response = await githubRequest<GitHubContentItem>(
      'get',
      buildContentsUrl(path),
      { accept: GITHUB_ACCEPT.json },
    );
    if (Array.isArray(response)) return null;
    return response.sha ?? null;
  } catch (error) {
    const apiError = toGitHubApiError(error);
    if (apiError.isNotFound) return null;
    throw apiError;
  }
}