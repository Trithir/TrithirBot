import LurkService from './lurk.service';
import LurkWindowService from './lurk-window.service';
import SpotifyService from './spotify.service';
import TtsService from './tts.service';
import TwitchService from './twitch.service';

const runApp = async () => {
  try {
    const spotifyService = new SpotifyService();
    const lurkWindowService = new LurkWindowService();
    await lurkWindowService.initialize();

    const lurkService = new LurkService(lurkWindowService.stateFilePath);
    await lurkService.initialize();

    const ttsService = new TtsService(lurkWindowService);
    await spotifyService.authorize(async () => {
      try {
        const twitchService = new TwitchService(spotifyService, ttsService, lurkService);
        await twitchService.connectToChat();
      } catch { console.error("Problems connecting to twitch in runApp") }
    });
  } catch { console.error("runApp Failed!") }
};

runApp().then();
