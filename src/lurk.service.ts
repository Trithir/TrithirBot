import { promises as fs } from 'fs';
import path from 'path';
import { ChatUserstate } from 'tmi.js';
import { LURK_PREFIX } from './config.json';

export type Lurker = {
  id: string;
  username: string;
  displayName: string;
  color?: string;
  startedAt: number;
  retriggeredAt?: number;
};

type LurkStateFile = {
  lurkers: Lurker[];
  updatedAt: number;
};

export type LurkResult = {
  lurker: Lurker;
  retriggered: boolean;
};

export default class LurkService {
  private readonly lurkers = new Map<string, Lurker>();
  private stateWriteQueue: Promise<void> = Promise.resolve();

  constructor(private readonly stateFilePath: string) {}

  public async initialize(): Promise<void> {
    await fs.mkdir(path.dirname(this.stateFilePath), { recursive: true });
    await this.scheduleWriteState();
  }

  public markLurking(userState: ChatUserstate): LurkResult {
    const now = Date.now();
    const username = this.getUsername(userState);
    const existingLurker = this.lurkers.get(username);
    const lurker: Lurker = {
      id: username,
      username,
      displayName: this.getDisplayName(userState),
      color: this.getColor(userState),
      startedAt: existingLurker ? existingLurker.startedAt : now,
      retriggeredAt: existingLurker ? now : undefined,
    };

    this.lurkers.set(username, lurker);
    void this.scheduleWriteState();
    return {
      lurker,
      retriggered: !!existingLurker,
    };
  }

  public clearIfActive(userState: ChatUserstate, message: string): void {
    const username = this.getUsername(userState);

    if (!username || !this.lurkers.has(username)) {
      return;
    }

    if (startsWithLurkPrefix(message)) {
      return;
    }

    this.lurkers.delete(username);
    void this.scheduleWriteState();
  }

  public getLurkers(): Lurker[] {
    return Array.from(this.lurkers.values()).sort((left, right) => left.startedAt - right.startedAt);
  }

  private scheduleWriteState(): Promise<void> {
    this.stateWriteQueue = this.stateWriteQueue
      .catch((error) => {
        console.error(`Previous lurk state write failed: ${error}`);
      })
      .then(async () => {
        await this.writeState();
      });

    return this.stateWriteQueue;
  }

  private async writeState(): Promise<void> {
    const state: LurkStateFile = {
      lurkers: this.getLurkers(),
      updatedAt: Date.now(),
    };

    await fs.writeFile(this.stateFilePath, JSON.stringify(state, null, 2), 'utf8');
  }

  private getUsername(userState: ChatUserstate): string {
    return (userState.username || '').toLowerCase();
  }

  private getDisplayName(userState: ChatUserstate): string {
    const displayName = userState['display-name'];
    return typeof displayName === 'string' && displayName.trim()
      ? displayName.trim()
      : userState.username || 'unknown_user';
  }

  private getColor(userState: ChatUserstate): string | undefined {
    return typeof userState.color === 'string' && userState.color.trim()
      ? userState.color.trim()
      : undefined;
  }
}

const startsWithLurkPrefix = (message: string): boolean =>
  !!LURK_PREFIX && message.startsWith(LURK_PREFIX);
