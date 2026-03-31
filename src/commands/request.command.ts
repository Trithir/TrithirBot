import {
  COMMAND_PREFIX,
  COMMAND_PREFIX2,
  TWITCH_CHANNEL,
} from '../config.json';
import {
  getArtistName,
  getSongName,
  getTrackIdFromLink,
  SPOTIFY_LINK_START,
} from '../messageUtils';
import { removePrefix, startsWithPrefix } from './helpers';
import { CommandContext, TwitchCommand } from './types';

const requestPrefixes = [COMMAND_PREFIX, COMMAND_PREFIX2].filter(Boolean);

const buildSpotifyRequestMessage = () =>
  'Unable to parse songName and artistName from message. Remember, the format is !gimme artist - song ';

export default class RequestCommand implements TwitchCommand {
  public matches(message: string): boolean {
    return requestPrefixes.some((prefix) => startsWithPrefix(message, prefix));
  }

  public async execute(context: CommandContext): Promise<void> {
    const prefix = this.findMatchingPrefix(context.message);

    if (!prefix) {
      return;
    }

    console.log(`>>>>>>>>>>${prefix}>>>>>>>>>>`);
    const request = removePrefix(context.message, prefix);

    if (request.startsWith(SPOTIFY_LINK_START)) {
      await this.handleSpotifyLink(request, context);
    } else {
      await this.handleSearch(request, context);
    }

    console.log('<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<');
  }

  private findMatchingPrefix(message: string): string | undefined {
    return requestPrefixes.find((prefix) => startsWithPrefix(message, prefix));
  }

  private async handleSearch(
    message: string,
    context: CommandContext
  ): Promise<void> {
    const songName = getSongName(message);
    const artistName = getArtistName(message);

    if (songName && artistName) {
      await context.spotifyService.searchAndAdd(songName, artistName, context.say);
      return;
    }

    context.say(buildSpotifyRequestMessage());
    console.error('Unable to parse songName and artistName from message');
  }

  private async handleSpotifyLink(
    message: string,
    context: CommandContext
  ): Promise<void> {
    const trackId = getTrackIdFromLink(message);
    console.log(trackId);

    if (trackId) {
      await context.spotifyService.addTrack(trackId, context.say);
      return;
    }

    console.error('Unable to parse track ID from message');
    context.say(`Unable to add a Spotify track from that message in ${TWITCH_CHANNEL}`);
  }
}
