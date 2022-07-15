import SpotifyService from './spotify.service';
import TwitchService from './twitch.service';

const runApp = async () => {
  try {
    const spotifyService = new SpotifyService();
    await spotifyService.authorize(async () => {
      try {
        const twitchService = new TwitchService(spotifyService);
        await twitchService.connectToChat();
      } catch { console.error("Problems connecting to twitch in runApp") }
    });
  } catch { console.error("runApp Failed!") }
};

runApp().then();
