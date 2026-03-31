import CommunityCommand from './community.command';
import CounterCommand from './counter.command';
import PlaylistCommand from './playlist.command';
import RequestCommand from './request.command';
import TtsCommand from './tts.command';
import { TwitchCommand } from './types';

export const buildCommands = (): TwitchCommand[] => [
  new RequestCommand(),
  new TtsCommand(),
  new PlaylistCommand(),
  new CommunityCommand(),
  new CounterCommand(),
];
