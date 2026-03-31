import {
  BURP_PREFIX,
  DROP_PREFIX,
  DROPFIX_PREFIX,
} from '../config.json';
import { startsWithPrefix } from './helpers';
import { updateCounter } from './counter.utils';
import { CommandContext, TwitchCommand } from './types';

export default class CounterCommand implements TwitchCommand {
  public matches(message: string): boolean {
    return (
      startsWithPrefix(message, DROP_PREFIX) ||
      startsWithPrefix(message, DROPFIX_PREFIX) ||
      startsWithPrefix(message, BURP_PREFIX)
    );
  }

  public async execute(context: CommandContext): Promise<void> {
    if (startsWithPrefix(context.message, DROP_PREFIX)) {
      console.log('>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>');
      const count = await updateCounter('DropCount.txt', 1);
      context.say(`Trithir hath droppen the stix ${count} times!`);
      console.log('Butter Fingers!');
      console.log('<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<');
      return;
    }

    if (startsWithPrefix(context.message, DROPFIX_PREFIX)) {
      console.log('>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>');
      const count = await updateCounter('DropCount.txt', -1);
      context.say(`Wooops! Trithir hath only droppen the stix ${count} times!`);
      console.log('They trying to mess up my stick count!');
      console.log('<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<');
      return;
    }

    if (startsWithPrefix(context.message, BURP_PREFIX)) {
      console.log('>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>');
      const count = await updateCounter('BurpCount.txt', 1);
      context.say(`DID YOU HEAR THAT?! ${count} belches and counting!!`);
      console.log('BEEEEEEEEEEEEEEEEEEEEEEEEEELCH');
      console.log('<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<');
    }
  }
}
