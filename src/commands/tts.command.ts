import {
  TTS_CHEER_PREFIX,
  TTS_CLOSE_PREFIX,
  TTS_MODS_PREFIX,
  TTS_OPEN_PREFIX,
  TTS_PREFIX,
  TTS_SUBSCRIBERS_PREFIX,
} from '../config.json';
import { removePrefix, startsWithPrefix } from './helpers';
import { CommandContext, TwitchCommand } from './types';

export default class TtsCommand implements TwitchCommand {
  public matches(message: string): boolean {
    return (
      startsWithPrefix(message, TTS_PREFIX) ||
      startsWithPrefix(message, TTS_OPEN_PREFIX) ||
      startsWithPrefix(message, TTS_CLOSE_PREFIX) ||
      startsWithPrefix(message, TTS_MODS_PREFIX) ||
      startsWithPrefix(message, TTS_SUBSCRIBERS_PREFIX) ||
      startsWithPrefix(message, TTS_CHEER_PREFIX)
    );
  }

  public async execute(context: CommandContext): Promise<void> {
    console.log('>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>');

    try {
      const result = await this.resolveResult(context);
      if (result.message) {
        context.say(result.message);
      }
    } catch (error) {
      console.error(`Unable to process TTS request: ${error}`);
      context.say('TTS had a problem while generating audio.');
    }

    console.log('<<<<<<<<<<<<<<TTS<<<<<<<<<<<<<<<<');
  }

  private resolveResult(context: CommandContext) {
    if (startsWithPrefix(context.message, TTS_OPEN_PREFIX)) {
      return context.ttsService.open(context.userState);
    }

    if (startsWithPrefix(context.message, TTS_CLOSE_PREFIX)) {
      return context.ttsService.close(context.userState);
    }

    if (startsWithPrefix(context.message, TTS_MODS_PREFIX)) {
      return context.ttsService.mods(context.userState);
    }

    if (startsWithPrefix(context.message, TTS_SUBSCRIBERS_PREFIX)) {
      return context.ttsService.subscribers(context.userState);
    }

    if (startsWithPrefix(context.message, TTS_CHEER_PREFIX)) {
      return context.ttsService.cheer(context.userState);
    }

    const request = removePrefix(context.message, TTS_PREFIX);
    return context.ttsService.enqueue(request, context.userState);
  }
}
