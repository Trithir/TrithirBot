import { ChatUserstate } from 'tmi.js';
import SpotifyService from '../spotify.service';
import TtsService from '../tts.service';

export type SayFn = (message: string) => void;

export interface CommandContext {
  message: string;
  userState: ChatUserstate;
  spotifyService: SpotifyService;
  ttsService: TtsService;
  say: SayFn;
}

export interface TwitchCommand {
  matches(message: string): boolean;
  execute(context: CommandContext): Promise<void>;
}
