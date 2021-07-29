import tmi, { ChatUserstate } from 'tmi.js';
import {getTrackIdFromLink, SPOTIFY_LINK_START} from './messageUtils';
import SpotifyService from './spotify.service';
import { TWITCH_CHANNEL, COMMAND_PREFIX, DROP_PREFIX, DROPFIX_PREFIX, BURP_PREFIX, BOT_USERNAME, TWITCH_TOKEN, COMMAND_PREFIX2 } from './config.json';
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

    this.twitchClient.on('connected', (_addr: string, _port: number) => {
      console.log(`Connected to ${TWITCH_CHANNEL}'s chat`)
      this.twitchClient.say(TWITCH_CHANNEL, "Feed me your commands!")
    });

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

    if (COMMAND_PREFIX && msg.startsWith(COMMAND_PREFIX )) {
      console.log('>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>');
      msg = msg.substring(`${COMMAND_PREFIX } `.length);
      if (msg.startsWith(SPOTIFY_LINK_START))//add OR operator with track/artist
      {
        await this.handleSpotifyLink(msg);
      } else {
        await this.handleSearch(msg);
      }
      console.log('<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<');
    }

    if (COMMAND_PREFIX2 && msg.startsWith(COMMAND_PREFIX2)) {
      console.log('>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>');
      msg = msg.substring(`${COMMAND_PREFIX2} `.length);
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

    if (DROPFIX_PREFIX && msg.startsWith(DROPFIX_PREFIX)) {
      console.log('>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>');
      const fsLibrary  = require('fs')
      let count = await fsLibrary.readFile('DropCount.txt', ((error: any, txtString: any) => {
        count = +txtString - 1;
        this.twitchClient.say(TWITCH_CHANNEL, "Wooops! Trithir hath only droppen the stix " + count + " times!");
        fsLibrary.writeFile('DropCount.txt', count.toString(), (error: any) => {
          if (error) throw error;
        })
        if (error) throw error;
      }))
      console.log('<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<');
    }

    if (BURP_PREFIX && msg.startsWith(BURP_PREFIX)) {
      console.log('>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>');
      const fsLibrary  = require('fs')
      let count = await fsLibrary.readFile('BurpCount.txt', ((error: any, txtString: any) => {
        count = +txtString + 1;
        this.twitchClient.say(TWITCH_CHANNEL, "DID YOU HEAR THAT?! " + count + " belches and counting!!");
        fsLibrary.writeFile('BurpCount.txt', count.toString(), (error: any) => {
          if (error) throw error;
        })
        if (error) throw error;
      }))
      console.log('BEEEEEEEEEEEEEEEEEEEEEEEEEELCH');
      console.log('<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<');
    }
  }

  private async handleSearch(message: string){
    const songName = getSongName(message);
    const artistName = getArtistName(message);
    if (songName && artistName){
      await this.spotifyService.searchAndAdd(songName, artistName)
    } else {
      this.twitchClient.say(TWITCH_CHANNEL, "Unable to parse songName and artistName from message. Remember, the format is !gimme artist - song ");
      console.error('Unable to parse songName and artistName from message')
    }
  }


  private async handleSpotifyLink(message: string) {
    const trackId = getTrackIdFromLink(message);
    if (trackId) {
      await this.spotifyService.addTrack(trackId);
    } else {
      this.twitchClient.say(TWITCH_CHANNEL, "Unable to parse track ID from message, make sure you have copied the entire URL.");
      console.error('Unable to parse track ID from message');
    }
  }
}
