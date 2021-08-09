import SpotifyWebApi from 'spotify-web-api-node';
import { waitForCode } from './auth-server';
import config from './config.json';
import SpotifyAuth from './spotify-auth';
import fs from 'fs';
// import tmi, { ChatUserstate } from 'tmi.js';
// import { TWITCH_CHANNEL, COMMAND_PREFIX, DROP_PREFIX, BOT_USERNAME, TWITCH_TOKEN, COMMAND_PREFIX2 } from './config.json';

export default class SpotifyService {
  private spotifyApi: SpotifyWebApi;
  private spotifyAuth: SpotifyAuth;

  // twitchOptions = {
  //   channels: [TWITCH_CHANNEL],
  //   identity: {
  //     username: BOT_USERNAME,
  //     password: TWITCH_TOKEN,
  //   },
  // };

  // twitchClient = tmi.client(this.twitchOptions);

  constructor() {
    this.spotifyApi = new SpotifyWebApi({
      clientId: config.SPOTIFY_CLIENT_ID,
      clientSecret: config.SPOTIFY_CLIENT_SECRET,
      redirectUri: `http://localhost:${config.AUTH_SERVER_PORT}/spotifyAuth`,
    });

    if (!fs.existsSync('./spotify-auth-store.json')) {
      fs.writeFileSync(
        './spotify-auth-store.json',
        JSON.stringify(new SpotifyAuth('', '', new Date().getTime() / 1000))
      );
    }
    this.spotifyAuth = JSON.parse(
      fs.readFileSync('./spotify-auth-store.json', 'utf8')
    );
  }

  public async authorize(onAuth: Function) {
    console.log('Authorizing with Spotify');
    try {
      if (!this.spotifyAuth.refreshToken) {
        console.log('No credentials found, performing new authorization');
        await this.performNewAuthorization(onAuth);
      } else {
        console.log('Spotify credentials found');
        this.spotifyApi.setAccessToken(this.spotifyAuth.accessToken);
        this.spotifyApi.setRefreshToken(this.spotifyAuth.refreshToken);
        await onAuth();
      }
    } catch (e) {
      console.error(`Error authorizing with Spotify ${e}`);
      process.exit(-1);
    }
  }

  public async addTrack(trackId: string, say: any) {
    try {
      const addSong = async () => {
        console.log(`Attempting to add ${trackId}`);
        const songInfo = await this.spotifyApi.getTrack(trackId);
        if (config.ADD_TO_QUEUE) {
          await this.addToQueue(trackId, songInfo?.body.name);
          say(trackId + ' - added to playlist!')
        }
        if (config.ADD_TO_PLAYLIST) {
          await this.addToPlaylist(trackId, songInfo?.body.name);
        }
      };

      if (this.hasTokenExpired()) {
        console.log('Spotify token expired, refreshing...');
        await this.refreshToken(addSong);
      } else {
        await addSong();
      }
    } catch (e) {
      console.error(`Error adding track ${e}`);
    }
  }

  private async addToQueue(trackId: string, songName: string) {
    try {
      // @ts-ignore
      // TODO the Spotify Web API Node package hasn't published a new release with this yet so it doesn't show up in the @types
      await this.spotifyApi.addToQueue(this.createTrackURI(trackId));
      // this.twitchClient.say(TWITCH_CHANNEL, "Added " + songName + " to the list!");
      console.log(`Added ${songName} to playlist`);
    } catch (e) {
      e = e as Error;
      if (e.message === 'Not Found') {
        console.error(
          'Unable to add song to queue - Song may not exist or you may not have the Spotify client open and active'
        );
      } else {
        console.error(`Error: Unable to add song to queue - ${e.message}`);
      }
    }
  }

  public async searchAndAdd(songName: string, artistName: string, say: any) {
    try {
    const searchInfo = await this.spotifyApi.searchTracks(`track:${songName} artist:${artistName}`)
      await this.addToPlaylist(searchInfo.body.tracks?.items[0].id, searchInfo.body.tracks?.items[0].name)
      console.log(searchInfo.body.tracks?.items[0].id)
      say(songName + ' - added to playlist!')
      }
    catch (e){
      console.log('Something went wrong!', e);
      say('Unable to parse songName and artistName from message. Remember, the format is !gimme artist - song ')
    }
  }

  private async addToPlaylist(trackId: string | undefined, songName: string | undefined) {
    try {
      if (config.SPOTIFY_PLAYLIST_ID && config.SPOTIFY_PLAYLIST_ID2) {
          await this.spotifyApi.addTracksToPlaylist(
            config.SPOTIFY_PLAYLIST_ID,
            [this.createTrackURI(trackId)]
          );         
           await this.spotifyApi.addTracksToPlaylist(
            config.SPOTIFY_PLAYLIST_ID2,
            [this.createTrackURI(trackId)]
          );
          // this.twitchClient.say(TWITCH_CHANNEL, "Added " + songName + " to the list!");
          console.log(`Added ${songName} to playlist`);
      } else {
        console.error(
          'Error: Cannot add to playlist - Please provide a playlist ID in the config file'
        );
      }
    } catch (e) {
      console.error(`Error: Unable to add song to playlist - ${e}`);
    }
  }

  private createTrackURI = (trackId: string | undefined): string =>
    `spotify:track:${trackId}`;

  private async doesPlaylistContainTrack(trackId: string) {
    const playlistInfo = await this.spotifyApi.getPlaylist(
      config.SPOTIFY_PLAYLIST_ID
    );

    let i;
    for (i = 0; i < playlistInfo.body.tracks.items.length; i++) {
      if (playlistInfo.body.tracks.items[i].track.id === trackId) {
        return true;
      }
    }
    return false;
  }

  private getAuthorizationUrl() {
    const scopes = [
      'user-modify-playback-state',
      'playlist-read-private',
      'playlist-modify-public',
      'playlist-modify-private',
    ];

    return this.spotifyApi.createAuthorizeURL(scopes, '');
  }

  private async performNewAuthorization(onAuth: Function) {
    const authUrl = this.getAuthorizationUrl();
    console.log('Click the following link and give this app permissions');
    console.log(authUrl);
    waitForCode((code: string) => {
      this.spotifyApi.authorizationCodeGrant(code, async (error, data) => {
        if (error) {
          console.error(error);
          process.exit(-1);
        }
        const accessToken = data.body['access_token'];
        const refreshToken = data.body['refresh_token'];
        const expireTime = this.calculateExpireTime(data.body['expires_in']);
        this.writeNewSpotifyAuth(accessToken, refreshToken, expireTime);
        this.spotifyApi.setAccessToken(accessToken);
        this.spotifyApi.setRefreshToken(refreshToken);
        await onAuth();
      });
    });
  }

  private async refreshToken(onAuth: Function) {
    try {
      this.spotifyApi.setRefreshToken(this.spotifyAuth.refreshToken);
      this.spotifyApi.refreshAccessToken(async (err, data) => {
        if (err) {
          console.error(err);
          process.exit(-1);
        }
        const accessToken = data.body['access_token'];
        this.spotifyApi.setAccessToken(accessToken);
        const expireTime = this.calculateExpireTime(data.body['expires_in']);
        this.writeNewSpotifyAuth(
          accessToken,
          this.spotifyAuth.refreshToken,
          expireTime
        );
        await onAuth();
      });
    } catch (e) {
      console.error(`Error refreshing access token ${e}`);
      process.exit(-1);
    }
  }

  private calculateExpireTime = (expiresIn: number): number =>
    new Date().getTime() / 1000 + expiresIn;

  private writeNewSpotifyAuth(
    accessToken: string,
    refreshToken: string,
    expireTime: number
  ) {
    const newSpotifyAuth = new SpotifyAuth(
      accessToken,
      refreshToken,
      expireTime
    );
    this.spotifyAuth = newSpotifyAuth;
    fs.writeFile(
      './spotify-auth-store.json',
      JSON.stringify(newSpotifyAuth),
      (err) => {
        if (err) console.error(err);
      }
    );
  }

  private hasTokenExpired(): boolean {
    return new Date().getTime() / 1000 >= this.spotifyAuth.expireTime;
  }
}
