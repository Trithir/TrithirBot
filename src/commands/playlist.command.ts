import {
  CLEAR_PLAYLIST_PREFIX,
  NOWPLAYING_PREFIX,
} from '../config.json';
import { startsWithPrefix } from './helpers';
import { CommandContext, TwitchCommand } from './types';

export default class PlaylistCommand implements TwitchCommand {
  public matches(message: string): boolean {
    return (
      startsWithPrefix(message, CLEAR_PLAYLIST_PREFIX) ||
      startsWithPrefix(message, NOWPLAYING_PREFIX)
    );
  }

  public async execute(context: CommandContext): Promise<void> {
    if (startsWithPrefix(context.message, CLEAR_PLAYLIST_PREFIX)) {
      console.log('>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>');
      await context.spotifyService.ClearPlaylist(context.say);
      console.log('<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<');
      return;
    }

    if (startsWithPrefix(context.message, NOWPLAYING_PREFIX)) {
      console.log('>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>');
      await context.spotifyService.getCurrentSong(context.say);
      console.log('<<<<<<<<<<<<<<PUT YOUR HANDS UPP!<<<<<<<<<<<<<<<<');
    }
  }
}
