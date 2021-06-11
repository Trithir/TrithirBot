import tmi, { ChatUserstate } from 'tmi.js';
import {getTrackIdFromLink, SPOTIFY_LINK_START} from './messageUtils';
import SpotifyService from './spotify.service';
import { TWITCH_CHANNEL, COMMAND_PREFIX, DROP_PREFIX, BOT_USERNAME, TWITCH_TOKEN } from './config.json';
import {getArtistName, getSongName} from './messageUtils';

export default class TwitchService {
  twitchOptions = {
    channels: [TWITCH_CHANNEL],
    identity: {
      username: BOT_USERNAME,
      password: TWITCH_TOKEN,
    },
  };

  twitchClient = tmi.client(this.twitchOptions);

  constructor(private spotifyService: SpotifyService) {}

  public async connectToChat() {

    this.twitchClient.on('connected', (_addr: string, _port: number) =>
      console.log(`Connected to ${TWITCH_CHANNEL}'s chat`)
    );

    this.twitchClient.on(
      'message',
      async (
        target: string,
        userState: ChatUserstate,
        msg: string,
        self: boolean
      ) => await this.handleMessage(target, userState, msg, self)
    );

    await this.twitchClient.connect();
  }

  private async handleMessage(
    _target: string,
    _userState: ChatUserstate,
    msg: string,
    self: boolean
  ) {
    if (self) {
      return;
    }

    if (COMMAND_PREFIX && msg.startsWith(COMMAND_PREFIX)) {
      console.log('>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>');
      msg = msg.substring(`${COMMAND_PREFIX} `.length);
      if (msg.startsWith(SPOTIFY_LINK_START))//add OR operator with track/artist
       {
        await this.handleSpotifyLink(msg);
      } else {
        await this.handleSearch(msg);
      }
      console.log('<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<');
    }

  if (DROP_PREFIX && msg.startsWith(DROP_PREFIX)) {
    console.log('>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>');
    this.twitchClient.say(TWITCH_CHANNEL, "Trithir hath droppen the stix 5 times!");
    // client.say("channel", "Your message")
    //   .then((data) => {
    //       // data returns [channel]
    //   }).catch((err) => {
    //       //
    // });
    // DropCount += 1
    console.log('<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<');
  }
}

  private async handleSearch(message: string){
    const songName = getSongName(message);
    const artistName = getArtistName(message);
    if (songName && artistName){
      await this.spotifyService.searchAndAdd(songName, artistName)
    } else {
      console.error('Unable to parse songName and artistName from message')
    }
  }


  private async handleSpotifyLink(message: string) {
    const trackId = getTrackIdFromLink(message);
    if (trackId) {
      await this.spotifyService.addTrack(trackId);
    } else {
      console.error('Unable to parse track ID from message');
    }
  }
}
