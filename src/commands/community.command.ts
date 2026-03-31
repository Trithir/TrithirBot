import {
  COSMIC_LINKS,
  DISCORD_PREFIX,
  HELP_PREFIX,
  LURK_PREFIX,
  SHOUT_PREFIX,
} from '../config.json';
import { removePrefix, startsWithPrefix } from './helpers';
import { CommandContext, TwitchCommand } from './types';

export default class CommunityCommand implements TwitchCommand {
  public matches(message: string): boolean {
    return (
      startsWithPrefix(message, HELP_PREFIX) ||
      startsWithPrefix(message, LURK_PREFIX) ||
      startsWithPrefix(message, DISCORD_PREFIX) ||
      startsWithPrefix(message, SHOUT_PREFIX) ||
      startsWithPrefix(message, COSMIC_LINKS)
    );
  }

  public async execute(context: CommandContext): Promise<void> {
    if (startsWithPrefix(context.message, HELP_PREFIX)) {
      console.log('>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>');
      context.say(
        'Try one of these: !cc !song, !drop, !oops, !burp, !lurk, !discord, !tts, !ttsopen, !ttsclose, !ttsmods, !ttssubscribers, !ttscheer, !gimme artist - song, !gimme spotify.link'
      );
      console.log('<<<<<<<<<<<<<<Someone Wanted Help<<<<<<<<<<<<<<<<');
      return;
    }

    if (startsWithPrefix(context.message, LURK_PREFIX)) {
      console.log('>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>');
      context.say(`${context.userState.username} has slunk to the shadows!`);
      console.log('<<<<<<<<<<<<<<Lurkerer man!<<<<<<<<<<<<<<<<');
      return;
    }

    if (startsWithPrefix(context.message, DISCORD_PREFIX)) {
      console.log('>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>');
      context.say('Join the discordussion!  https://discord.gg/zPTeK674fS');
      console.log('<<<<<<<<<<<<<<Discord<<<<<<<<<<<<<<<<');
      return;
    }

    if (startsWithPrefix(context.message, SHOUT_PREFIX)) {
      console.log('>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>');
      const user = removePrefix(context.message, SHOUT_PREFIX);
      context.say(
        `A friend of Trithir deserves a follow! >>> https://www.twitch.tv/${user}`
      );
      console.log('<<<<<<<<<<<<<<PUT YOUR HANDS UPP!<<<<<<<<<<<<<<<<');
      return;
    }

    if (startsWithPrefix(context.message, COSMIC_LINKS)) {
      console.log('>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>');
      context.say(
        'Check out the band! Spotify: https://open.spotify.com/artist/416Z5tNawyaQwz8K9s6t7h?si=-UJHjfKAQeWUg0FLxmnmnQ BandCamp: https://cosmicconjurers.bandcamp.com/ YouTube: https://www.youtube.com/@CosmicConjurers'
      );
      console.log('<<<<<<<<<<<<<<COSMIC FOLLOWERS!<<<<<<<<<<<<<<<<');
    }
  }
}
