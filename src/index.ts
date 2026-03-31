import SpotifyService from './spotify.service';
import TtsService from './tts.service';
import TwitchService from './twitch.service';

const runApp = async () => {
  try {
    const spotifyService = new SpotifyService();
    const ttsService = new TtsService();
    await spotifyService.authorize(async () => {
      try {
        const twitchService = new TwitchService(spotifyService, ttsService);
        await twitchService.connectToChat();
      } catch { console.error("Problems connecting to twitch in runApp") }
    });
  } catch { console.error("runApp Failed!") }
};

runApp().then();
