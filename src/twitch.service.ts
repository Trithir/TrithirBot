import tmi, { ChatUserstate } from 'tmi.js';
import {getTrackIdFromLink, SPOTIFY_LINK_START} from './messageUtils';
import SpotifyService from './spotify.service';
import { TWITCH_CHANNEL, COMMAND_PREFIX, DROP_PREFIX, BOT_USERNAME, TWITCH_TOKEN, COMMAND_PREFIX2 } from './config.json';
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

    if (COMMAND_PREFIX || COMMAND_PREFIX2 && msg.startsWith(COMMAND_PREFIX || COMMAND_PREFIX2)) {
      console.log('>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>');
      msg = msg.substring(`${COMMAND_PREFIX || COMMAND_PREFIX2} `.length);
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
    const fsLibrary  = require('fs')
    let count = await fsLibrary.readFile('DropCount.txt', ((error: any, txtString: any) => {
      count = +txtString + 1;
      this.twitchClient.say(TWITCH_CHANNEL, "Trithir hath droppen the stix " + count + " times!");
      fsLibrary.writeFile('DropCount.txt', count.toString(), (error: any) => {
        if (error) throw error;
      })
      if (error) throw error;
    }))
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
