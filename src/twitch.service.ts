import tmi, { ChatUserstate } from 'tmi.js';
import { getTrackIdFromLink, SPOTIFY_LINK_START } from './messageUtils';
import SpotifyService from './spotify.service';
import { TWITCH_CHANNEL, COMMAND_PREFIX, DROP_PREFIX, DROPFIX_PREFIX, BURP_PREFIX, BOT_USERNAME, TWITCH_TOKEN, COMMAND_PREFIX2, SHOUT_PREFIX, NOWPLAYING_PREFIX, CLEAR_PLAYLIST_PREFIX } from './config.json';
import { getArtistName, getSongName } from './messageUtils';

export default class TwitchService {
  twitchOptions = {
    channels: [TWITCH_CHANNEL],
    identity: {
      username: BOT_USERNAME,
      password: TWITCH_TOKEN,
    },
  };

  twitchClient = tmi.client(this.twitchOptions);
  say = (s: string) => { this.twitchClient.say(TWITCH_CHANNEL, s); }

  constructor(private spotifyService: SpotifyService) { }

  public async connectToChat() {
    this.twitchClient.on('connected', (_addr: string, _port: number) => console.log(`Connected to ${TWITCH_CHANNEL}'s chat`));
    // this.twitchClient.say(TWITCH_CHANNEL, "Feed me your commands!")
    this.twitchClient.on(
      'message',
      async (
        target: string,
        userState: ChatUserstate,
        msg: string,
        self: boolean
      ) => await this.handleMessage(target, userState, msg, self)
    );
    try {
      await this.twitchClient.connect();
    } catch { console.error("this.twitchClient.Connect() did not do the thing.") }
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
    console.log(msg);
    if (COMMAND_PREFIX && msg.startsWith(COMMAND_PREFIX)) {
      console.log('>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>');
      let request = this.RemovePrefix(msg, COMMAND_PREFIX)
      if (request.startsWith(SPOTIFY_LINK_START))//add OR operator with track/artist
      {
        await this.handleSpotifyLink(request);
      } else {
        await this.handleSearch(request);
      }
      console.log('<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<');
    }

    else if (COMMAND_PREFIX2 && msg.startsWith(COMMAND_PREFIX2)) {
      console.log('>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>');
      let request = this.RemovePrefix(msg, COMMAND_PREFIX2)
      if (request.startsWith(SPOTIFY_LINK_START))//add OR operator with track/artist
      {
        await this.handleSpotifyLink(request);
      } else {
        await this.handleSearch(request);
      }
      console.log('<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<');
    }

    else if (CLEAR_PLAYLIST_PREFIX && msg.startsWith(CLEAR_PLAYLIST_PREFIX)) {
      console.log('>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>');
      let request = this.RemovePrefix(msg, CLEAR_PLAYLIST_PREFIX)
      this.spotifyService.ClearPlaylist(this.say)
      console.log('<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<');
    }

    else if (NOWPLAYING_PREFIX && msg.startsWith(NOWPLAYING_PREFIX)) {
      console.log('>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>');
      this.spotifyService.getCurrentSong(this.say)
      console.log('<<<<<<<<<<<<<<PUT YOUR HANDS UPP!<<<<<<<<<<<<<<<<');
    }

    else if (DROP_PREFIX && msg.startsWith(DROP_PREFIX)) {
      console.log('>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>');
      const fsLibrary = require('fs')
      let count = await fsLibrary.readFile('DropCount.txt', ((error: any, txtString: any) => {
        count = +txtString + 1;
        this.twitchClient.say(TWITCH_CHANNEL, "Trithir hath droppen the stix " + count + " times!");
        fsLibrary.writeFile('DropCount.txt', count.toString(), (error: any) => {
          if (error) throw error;
        })
        if (error) throw error;
      }))
      console.log('Butter Fingers!')
      console.log('<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<');
    }

    else if (DROPFIX_PREFIX && msg.startsWith(DROPFIX_PREFIX)) {
      console.log('>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>');
      const fsLibrary = require('fs')
      let count = await fsLibrary.readFile('DropCount.txt', ((error: any, txtString: any) => {
        count = +txtString - 1;
        this.twitchClient.say(TWITCH_CHANNEL, "Wooops! Trithir hath only droppen the stix " + count + " times!");
        fsLibrary.writeFile('DropCount.txt', count.toString(), (error: any) => {
          if (error) throw error;
        })
        if (error) throw error;
      }))
      console.log('They trying to mess up my stick count!')
      console.log('<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<');
    }

    else if (BURP_PREFIX && msg.startsWith(BURP_PREFIX)) {
      console.log('>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>');
      const fsLibrary = require('fs')
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

    else if (SHOUT_PREFIX && msg.startsWith(SHOUT_PREFIX)) {
      console.log('>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>');
      let user = this.RemovePrefix(msg, SHOUT_PREFIX)
      this.twitchClient.say(TWITCH_CHANNEL, "A friend of Trithir deserves a follow! >>> https://www.twitch.tv/" + user);
      console.log('<<<<<<<<<<<<<<PUT YOUR HANDS UPP!<<<<<<<<<<<<<<<<');
    }
  }

  private async handleSearch(message: string) {
    const songName = getSongName(message);
    const artistName = getArtistName(message);
    if (songName && artistName) {
      await this.spotifyService.searchAndAdd(songName, artistName, this.say
      )
    } else {
      this.twitchClient.say(TWITCH_CHANNEL, "Unable to parse songName and artistName from message. Remember, the format is !gimme artist - song ");
      console.error('Unable to parse songName and artistName from message')
    }
  }


  private async handleSpotifyLink(message: string) {

    const trackId = getTrackIdFromLink(message);
    console.log(trackId)

    if (trackId) {
      console.log(trackId)
      await this.spotifyService.addTrack(trackId, this.say);
    } else {
      console.error('Unable to parse track ID from message');
    }
  }

  private RemovePrefix(message: string, prefix: string) {
    //remove the prefix and return the rest of the message
    let msg = message.substring(`${prefix} `.length);
    return msg;
  }
}
