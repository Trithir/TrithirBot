import { ChatUserstate } from 'tmi.js';
import { promises as fs } from 'fs';
import { spawn } from 'child_process';
import path from 'path';
import {
  TTS_ENABLED,
  TTS_CLOSE_PREFIX,
  TTS_CHEER_PREFIX,
  TTS_DENY_COOLDOWN_SECONDS,
  TTS_GLOBAL_COOLDOWN_SECONDS,
  TTS_MAX_LENGTH,
  TTS_MODE,
  TTS_MODEL_PATH,
  TTS_MODS_PREFIX,
  TTS_OPEN_PREFIX,
  TTS_OUTPUT_DIR,
  TTS_PYTHON_PATH,
  TTS_SUBSCRIBERS_PREFIX,
  TTS_USER_COOLDOWN_SECONDS,
} from './config.json';

type TtsResult = {
  accepted: boolean;
  message: string;
};

type TtsMode = 'open' | 'closed' | 'mods' | 'subscribers' | 'cheer';

export default class TtsService {
  private playbackQueue: Promise<void> = Promise.resolve();
  private readonly userCooldowns = new Map<string, number>();
  private lastGlobalRequestAt = 0;
  private isEnabled = TTS_ENABLED;
  private mode: TtsMode = this.resolveInitialMode();
  private lastDeniedMessageAt = 0;

  public async enqueue(text: string, userState: ChatUserstate): Promise<TtsResult> {
    if (!this.isEnabled) {
      return {
        accepted: false,
        message: this.getDeniedMessage('closed'),
      };
    }

    const accessResult = this.checkAccess(userState);
    if (!accessResult.allowed) {
      return {
        accepted: false,
        message: this.getDeniedMessage(accessResult.reason),
      };
    }

    const sanitizedText = this.sanitizeText(text);

    if (!sanitizedText) {
      return {
        accepted: false,
        message: 'Usage: !tts your message here',
      };
    }

    if (sanitizedText.length > TTS_MAX_LENGTH) {
      return {
        accepted: false,
        message: `TTS messages must be ${TTS_MAX_LENGTH} characters or fewer.`,
      };
    }

    const username = userState.username || 'unknown_user';
    const now = Date.now();
    const globalCooldownMs = TTS_GLOBAL_COOLDOWN_SECONDS * 1000;
    const userCooldownMs = TTS_USER_COOLDOWN_SECONDS * 1000;
    const globalWaitMs = this.lastGlobalRequestAt + globalCooldownMs - now;
    const userWaitMs = (this.userCooldowns.get(username) || 0) + userCooldownMs - now;

    if (globalWaitMs > 0) {
      return {
        accepted: false,
        message: `TTS is cooling down for ${Math.ceil(globalWaitMs / 1000)} more seconds.`,
      };
    }

    if (userWaitMs > 0) {
      return {
        accepted: false,
        message: `@${username}, please wait ${Math.ceil(userWaitMs / 1000)} seconds before using TTS again.`,
      };
    }

    this.lastGlobalRequestAt = now;
    this.userCooldowns.set(username, now);

    this.playbackQueue = this.playbackQueue
      .catch((error) => {
        console.error(`Previous TTS playback failed: ${error}`);
      })
      .then(async () => {
        await this.generateAndPlay(sanitizedText, username);
      });

    return {
      accepted: true,
      message: '',
    };
  }

  public open(userState: ChatUserstate): TtsResult {
    if (!this.canManage(userState)) {
      return {
        accepted: false,
        message: `${TTS_OPEN_PREFIX} is limited to mods.`,
      };
    }

    this.isEnabled = true;
    this.mode = 'open';
    return {
      accepted: true,
      message: 'TTS is now open to everyone.',
    };
  }

  public close(userState: ChatUserstate): TtsResult {
    if (!this.canManage(userState)) {
      return {
        accepted: false,
        message: `${TTS_CLOSE_PREFIX} is limited to mods.`,
      };
    }

    this.isEnabled = false;
    this.mode = 'closed';
    return {
      accepted: true,
      message: 'TTS is now closed.',
    };
  }

  public mods(userState: ChatUserstate): TtsResult {
    return this.setMode(userState, 'mods', TTS_MODS_PREFIX, 'TTS is now limited to mods.');
  }

  public subscribers(userState: ChatUserstate): TtsResult {
    return this.setMode(
      userState,
      'subscribers',
      TTS_SUBSCRIBERS_PREFIX,
      'TTS is now limited to subscribers, mods, and the broadcaster.'
    );
  }

  public cheer(userState: ChatUserstate): TtsResult {
    return this.setMode(
      userState,
      'cheer',
      TTS_CHEER_PREFIX,
      'TTS now requires bits in the same message unless the user is a mod or broadcaster.'
    );
  }

  private async generateAndPlay(text: string, username: string): Promise<void> {
    const outputDirectory = this.resolvePath(TTS_OUTPUT_DIR);
    const outputFilePath = path.join(
      outputDirectory,
      `tts-${Date.now()}-${this.toSafeFileSegment(username)}.wav`
    );

    await fs.mkdir(outputDirectory, { recursive: true });

    try {
      await this.runPiper(text, outputFilePath);
      await this.playAudio(outputFilePath);
    } finally {
      await fs.unlink(outputFilePath).catch(() => undefined);
    }
  }

  private async runPiper(text: string, outputFilePath: string): Promise<void> {
    const pythonPath = this.resolvePath(TTS_PYTHON_PATH);
    const modelPath = await this.resolveModelPath();

    await fs.access(modelPath);
    await new Promise<void>((resolve, reject) => {
      const child = spawn(
        pythonPath,
        ['-m', 'piper', '--model', modelPath, '--output_file', outputFilePath],
        {
          stdio: ['pipe', 'pipe', 'pipe'],
        }
      );

      let errorOutput = '';

      child.stdout.on('data', () => undefined);
      child.stderr.on('data', (chunk) => {
        errorOutput += chunk.toString();
      });
      child.on('error', (error) => {
        reject(error);
      });
      child.on('close', (code) => {
        if (code === 0) {
          resolve();
          return;
        }

        reject(
          new Error(
            `Piper exited with code ${code}${errorOutput ? `: ${errorOutput.trim()}` : ''}`
          )
        );
      });

      child.stdin.write(text);
      child.stdin.end();
    });
  }

  private async playAudio(outputFilePath: string): Promise<void> {
    const escapedPath = outputFilePath.replace(/'/g, "''");

    await new Promise<void>((resolve, reject) => {
      const child = spawn(
        'powershell.exe',
        [
          '-NoProfile',
          '-Command',
          `(New-Object Media.SoundPlayer '${escapedPath}').PlaySync()`,
        ],
        {
          stdio: ['ignore', 'pipe', 'pipe'],
        }
      );

      let errorOutput = '';

      child.stdout.on('data', () => undefined);
      child.stderr.on('data', (chunk) => {
        errorOutput += chunk.toString();
      });
      child.on('error', (error) => {
        reject(error);
      });
      child.on('close', (code) => {
        if (code === 0) {
          resolve();
          return;
        }

        reject(
          new Error(
            `Audio playback exited with code ${code}${errorOutput ? `: ${errorOutput.trim()}` : ''}`
          )
        );
      });
    });
  }

  private sanitizeText(text: string): string {
    return text.replace(/\s+/g, ' ').replace(/[^\x20-\x7E]/g, '').trim();
  }

  private isPrivilegedUser(userState: ChatUserstate): boolean {
    const isBroadcaster = !!userState.badges?.broadcaster;
    return !!userState.mod || isBroadcaster;
  }

  private isSubscriber(userState: ChatUserstate): boolean {
    return !!userState.subscriber || !!userState.badges?.subscriber;
  }

  private hasBitsInMessage(userState: ChatUserstate): boolean {
    return Number(userState.bits || 0) > 0;
  }

  private canManage(userState: ChatUserstate): boolean {
    return this.isPrivilegedUser(userState);
  }

  private setMode(
    userState: ChatUserstate,
    mode: TtsMode,
    commandPrefix: string,
    successMessage: string
  ): TtsResult {
    if (!this.canManage(userState)) {
      return {
        accepted: false,
        message: `${commandPrefix} is limited to mods.`,
      };
    }

    this.isEnabled = true;
    this.mode = mode;
    return {
      accepted: true,
      message: successMessage,
    };
  }

  private checkAccess(userState: ChatUserstate): { allowed: boolean; reason: TtsMode } {
    if (!this.isEnabled || this.mode === 'closed') {
      return { allowed: false, reason: 'closed' };
    }

    if (this.mode === 'open') {
      return { allowed: true, reason: 'open' };
    }

    if (this.isPrivilegedUser(userState)) {
      return { allowed: true, reason: this.mode };
    }

    if (this.mode === 'mods') {
      return { allowed: false, reason: 'mods' };
    }

    if (this.mode === 'subscribers') {
      return {
        allowed: this.isSubscriber(userState),
        reason: 'subscribers',
      };
    }

    if (this.mode === 'cheer') {
      return {
        allowed: this.hasBitsInMessage(userState),
        reason: 'cheer',
      };
    }

    return { allowed: false, reason: 'closed' };
  }

  private getDeniedMessage(reason: TtsMode): string {
    const now = Date.now();
    const denyCooldownMs = TTS_DENY_COOLDOWN_SECONDS * 1000;

    if (now - this.lastDeniedMessageAt < denyCooldownMs) {
      return '';
    }

    this.lastDeniedMessageAt = now;

    if (reason === 'mods') {
      return 'Mods-only TTS is currently enabled.';
    }

    if (reason === 'subscribers') {
      return 'Subscribers-only TTS is currently enabled.';
    }

    if (reason === 'cheer') {
      return 'Cheer-only TTS is currently enabled.';
    }

    return 'TTS is currently closed.';
  }

  private resolveInitialMode(): TtsMode {
    if (
      TTS_MODE === 'open' ||
      TTS_MODE === 'closed' ||
      TTS_MODE === 'mods' ||
      TTS_MODE === 'subscribers' ||
      TTS_MODE === 'cheer'
    ) {
      return TTS_MODE;
    }

    return 'mods';
  }

  private resolvePath(configuredPath: string): string {
    return path.isAbsolute(configuredPath)
      ? configuredPath
      : path.resolve(configuredPath);
  }

  private async resolveModelPath(): Promise<string> {
    const configuredPath = this.resolvePath(TTS_MODEL_PATH);
    const stats = await fs.stat(configuredPath);

    if (!stats.isDirectory()) {
      return configuredPath;
    }

    const modelFiles = (await fs.readdir(configuredPath))
      .filter((fileName) => fileName.endsWith('.onnx'))
      .sort();

    if (!modelFiles.length) {
      throw new Error(`No Piper model files were found in ${configuredPath}`);
    }

    return path.join(configuredPath, modelFiles[0]);
  }

  private toSafeFileSegment(value: string): string {
    return value.replace(/[^a-zA-Z0-9-_]/g, '_');
  }
}
