import Sound from 'react-native-sound';
import { Alert } from 'react-native';

Sound.setCategory('Playback', true);

const R2_BASE = 'https://pub-daee64ddf4df4b6e8f58100ed89fd6d2.r2.dev';
const MANIFEST_URL = `${R2_BASE}/manifest.json`;
const FALLBACK_BGM = `${R2_BASE}/bgm/autumn_day.m4a`;

// 🔥 调试开关：上线前改成 false
const DEBUG_BGM = true;

class BgmManager {
  private sound: Sound | null = null;
  private isPlaying: boolean = false;
  private currentUrl: string = FALLBACK_BGM;
  private retryCount: number = 0;
  private restartTimer: ReturnType<typeof setTimeout> | null = null;
  private externalHolders: Set<string> = new Set();

  private manifestFiles: string[] | null = null;
  private manifestLoading: Promise<string[]> | null = null;
  private initLock: boolean = false;

  public acquireExternal(holderId: string) {
    this.externalHolders.add(holderId);
    this.pause();
  }
  public releaseExternal(holderId: string) {
    this.externalHolders.delete(holderId);
  }
  public isExternallyHeld(): boolean {
    return this.externalHolders.size > 0;
  }
  public suspendForVideo() { this.acquireExternal('video'); }
  public resumeFromVideo() { this.releaseExternal('video'); }

  private async loadManifest(): Promise<string[]> {
    if (this.manifestFiles) return this.manifestFiles;
    if (this.manifestLoading) return this.manifestLoading;

    this.manifestLoading = (async () => {
      try {
        const res = await fetch(`${MANIFEST_URL}?t=${Date.now()}`);
        if (!res.ok) throw new Error(`manifest ${res.status}`);
        const data = await res.json();
        const files: string[] = Array.isArray(data?.files)
          ? data.files
              .map((f: any) => f?.path)
              .filter((p: any): p is string => typeof p === 'string' && p.length > 0)
          : [];
        this.manifestFiles = files;
        if (DEBUG_BGM) {
          Alert.alert('manifest 加载完成', `共 ${files.length} 条\nbgm 相关：\n${files.filter(p => p.startsWith('bgm/')).join('\n')}`);
        }
        return files;
      } catch (e: any) {
        if (DEBUG_BGM) Alert.alert('manifest 加载失败', String(e?.message ?? e));
        return [];
      } finally {
        this.manifestLoading = null;
      }
    })();

    return this.manifestLoading;
  }

  private async resolveBgmPath(season: string, isNight: boolean): Promise<string | null> {
    const files = await this.loadManifest();
    const suffix = isNight ? 'night' : 'day';
    const prefix = `bgm/${season}_${suffix}`;
    const candidates = files.filter((p) => p.startsWith(prefix) && !p.endsWith('/'));

    if (DEBUG_BGM) {
      Alert.alert(
        'resolveBgmPath',
        `season: ${season}\nisNight: ${isNight}\nprefix: ${prefix}\n\ncandidates:\n${candidates.join('\n') || '(空)'}`,
      );
    }

    if (candidates.length === 0) return null;
    return candidates[0];
  }

  public async setScene(season: string, isNight: boolean): Promise<void> {
    if (DEBUG_BGM) {
      Alert.alert('setScene 被调用', `season: ${season}\nisNight: ${isNight}\nheld: ${this.isExternallyHeld()}`);
    }

    if (this.isExternallyHeld()) return;

    const path = await this.resolveBgmPath(season, isNight);
    const url = path ? `${R2_BASE}/${path}` : FALLBACK_BGM;

    if (DEBUG_BGM) {
      Alert.alert('setScene 最终 URL', `${url}\n\ncurrentUrl: ${this.currentUrl}\n是否同一首: ${url === this.currentUrl}`);
    }

    if (url === this.currentUrl && this.sound && this.isPlaying) {
      return;
    }

    this.currentUrl = url;
    this.init(url);
  }

  public init(audioUrl?: string) {
    if (this.isExternallyHeld()) return;
    if (this.initLock) return;

    if (audioUrl) this.currentUrl = audioUrl;
    const targetUrl = this.currentUrl;

    if (this.sound && this.isPlaying) return;

    this.releaseSound();
    this.initLock = true;

    setTimeout(() => {
      if (this.isExternallyHeld()) {
        this.initLock = false;
        return;
      }

      this.sound = new Sound(targetUrl, '', (error) => {
        this.initLock = false;

        if (error) {
          if (DEBUG_BGM) Alert.alert('BGM 加载失败', `${targetUrl}\n\n${String((error as any)?.message ?? error)}`);
          this.isPlaying = false;
          if (this.retryCount < 5) {
            this.retryCount++;
            setTimeout(() => this.init(targetUrl), 1500);
          }
          return;
        }

        if (this.isExternallyHeld()) {
          try { this.sound?.stop(); this.sound?.release(); } catch {}
          this.sound = null;
          this.isPlaying = false;
          return;
        }

        this.retryCount = 0;
        this.isPlaying = true;
        this.playLoop();
      });
    }, 300);
  }

  private playLoop() {
    if (!this.sound || !this.isPlaying || this.isExternallyHeld()) return;

    const current = this.sound;
    try {
      current.play((success) => {
        if (!this.isPlaying || this.isExternallyHeld()) return;
        if (!this.sound || this.sound !== current) return;

        if (success) {
          try {
            this.sound.seekTo(0);
            this.playLoop();
          } catch {
            this.init(this.currentUrl);
          }
        } else {
          if (this.restartTimer) clearTimeout(this.restartTimer);
          this.restartTimer = setTimeout(() => {
            if (this.isPlaying && !this.isExternallyHeld()) {
              this.init(this.currentUrl);
            }
          }, 1000);
        }
      });
    } catch (e) {
      this.init(this.currentUrl);
    }
  }

  public pause() {
    this.isPlaying = false;
    if (this.sound) {
      try { this.sound.pause(); } catch {}
    }
  }

  public resume() {
    if (this.isExternallyHeld()) return;
    this.isPlaying = true;
    if (!this.sound) {
      this.init(this.currentUrl);
      return;
    }
    try {
      this.sound.getCurrentTime(() => {});
      this.playLoop();
    } catch {
      this.init(this.currentUrl);
    }
  }

  private releaseSound() {
    if (this.restartTimer) {
      clearTimeout(this.restartTimer);
      this.restartTimer = null;
    }
    if (this.sound) {
      try { this.sound.stop(); this.sound.release(); } catch {}
      this.sound = null;
    }
  }

  public stop() {
    this.isPlaying = false;
    this.releaseSound();
  }

  public toggle(): boolean {
    if (this.isPlaying) { this.pause(); return false; }
    this.resume();
    return true;
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }
}

export const bgmManager = new BgmManager();
