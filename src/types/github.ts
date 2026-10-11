export interface GitHubContentItem {
  name: string;
  path: string;
  sha: string;
  size: number;
  url: string;
  html_url: string;
  git_url: string;
  download_url: string | null;
  type: 'file' | 'dir' | 'symlink' | 'submodule';
}

export interface GitHubFileResponse extends GitHubContentItem {
  content: string;
  encoding: 'base64' | 'none';
}

export interface GitHubCommitInfo {
  sha: string;
  message: string;
  html_url: string;
  author: {
    name: string;
    email: string;
    date: string;
  } | null;
}

export interface GitHubPutResponse {
  content: {
    name: string;
    path: string;
    sha: string;
    size: number;
    html_url: string;
    download_url: string | null;
  };
  commit: GitHubCommitInfo;
}

export interface GitHubDeleteResponse {
  commit: GitHubCommitInfo;
}

export interface GitHubReleaseAsset {
  id: number;
  name: string;
  label: string | null;
  content_type: string;
  size: number;
  download_count: number;
  created_at: string;
  updated_at: string;
  browser_download_url: string;
}

export interface GitHubRelease {
  id: number;
  tag_name: string;
  name: string;
  body: string;
  draft: boolean;
  prerelease: boolean;
  created_at: string;
  published_at: string;
  html_url: string;
  assets: GitHubReleaseAsset[];
}

export interface GitHubErrorBody {
  message: string;
  documentation_url?: string;
  status?: string;
}

export interface GitHubApiError {
  status: number;
  message: string;
  isRateLimit: boolean;
  isUnauthorized: boolean;
  isNotFound: boolean;
  raw?: unknown;
}

export interface GitHubSyncResult<T> {
  data: T;
  sha: string | null;
  fromCache: boolean;
  fetchedAt: number;
}