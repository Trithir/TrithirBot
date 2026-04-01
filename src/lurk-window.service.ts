import { promises as fs } from 'fs';
import { spawn } from 'child_process';
import path from 'path';

export default class LurkWindowService {
  public readonly runtimeDirectory = path.resolve('.runtime');
  public readonly stateFilePath = path.join(this.runtimeDirectory, 'lurkers.json');
  public readonly audioQueueDirectory = path.join(this.runtimeDirectory, 'tts-queue');
  private readonly scriptPath = path.resolve(process.cwd(), 'scripts', 'lurk-window.ps1');
  private overlayProcess: ReturnType<typeof spawn> | null = null;

  public async initialize(): Promise<void> {
    await fs.mkdir(this.runtimeDirectory, { recursive: true });
    await fs.mkdir(this.audioQueueDirectory, { recursive: true });
    await fs.access(this.scriptPath);
    this.launchWindow();
  }

  public async enqueueAudio(outputFilePath: string, username: string): Promise<void> {
    await fs.mkdir(this.audioQueueDirectory, { recursive: true });

    const queuedFilePath = path.join(
      this.audioQueueDirectory,
      `tts-${Date.now()}-${this.toSafeFileSegment(username)}.wav`
    );

    await fs.copyFile(outputFilePath, queuedFilePath);
  }

  private launchWindow(): void {
    if (this.overlayProcess && !this.overlayProcess.killed) {
      return;
    }

    this.overlayProcess = spawn(
      'powershell.exe',
      [
        '-NoProfile',
        '-STA',
        '-ExecutionPolicy',
        'Bypass',
        '-File',
        this.scriptPath,
        '-StateFilePath',
        this.stateFilePath,
        '-AudioQueueDirectory',
        this.audioQueueDirectory,
      ],
      {
        stdio: ['ignore', 'pipe', 'pipe'],
        windowsHide: false,
      }
    );

    this.overlayProcess.stdout?.on('data', (chunk) => {
      const message = chunk.toString().trim();
      if (message) {
        console.log(`[lurk-window] ${message}`);
      }
    });
    this.overlayProcess.stderr?.on('data', (chunk) => {
      const message = chunk.toString().trim();
      if (message) {
        console.error(`[lurk-window] ${message}`);
      }
    });
    this.overlayProcess.on('exit', (code) => {
      console.error(`[lurk-window] exited with code ${code === null ? 'null' : code}`);
      this.overlayProcess = null;
    });
  }

  private toSafeFileSegment(value: string): string {
    return value.replace(/[^a-zA-Z0-9-_]/g, '_');
  }
}
