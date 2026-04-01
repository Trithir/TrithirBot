import tmi, { ChatUserstate } from 'tmi.js';
import LurkService from './lurk.service';
import SpotifyService from './spotify.service';
import TtsService from './tts.service';
import { BOT_USERNAME, TWITCH_CHANNEL, TWITCH_TOKEN } from './config.json';
import { buildCommands } from './commands';
import { CommandContext, TwitchCommand } from './commands/types';

export default class TwitchService {
  private readonly commands: TwitchCommand[];

  twitchOptions = {
    channels: [TWITCH_CHANNEL],
    identity: {
      username: BOT_USERNAME,
      password: TWITCH_TOKEN,
    },
  };

  twitchClient = tmi.client(this.twitchOptions);
  say = (s: string) => { this.twitchClient.say(TWITCH_CHANNEL, s); }

  constructor(
    private spotifyService: SpotifyService,
    private ttsService: TtsService,
    private lurkService: LurkService
  ) {
    this.commands = buildCommands();
  }

  public async connectToChat() {
    this.twitchClient.on('connected', (_addr: string, _port: number) => console.log(`Connected to ${TWITCH_CHANNEL}'s chat`));
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
      } catch { console.error("this.twitchClient.Connect() did not do the thing.") } //https://twitchapps.com/tmi/ To reset bot secret
      // this.twitchClient.say(TWITCH_CHANNEL, "Feed me your commands!")
  }

  private async handleMessage(
    _target: string,
    userState: ChatUserstate,
    msg: string,
    self: boolean
  ) {
    if (self) {
      return;
    }

    console.log(msg);
    console.log(userState);
    this.lurkService.clearIfActive(userState, msg);

    const command = this.commands.find((candidate) => candidate.matches(msg));

    if (!command) {
      return;
    }

    const commandContext: CommandContext = {
      message: msg,
      userState,
      lurkService: this.lurkService,
      spotifyService: this.spotifyService,
      ttsService: this.ttsService,
      say: this.say,
    };

    await command.execute(commandContext);
  }
}
