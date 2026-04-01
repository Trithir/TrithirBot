import { LURK_PREFIX } from '../config.json';
import { startsWithPrefix } from './helpers';
import { CommandContext, TwitchCommand } from './types';

const LURK_MESSAGES = [
	"{name} has slunk to the shadows!",
	"{name} fades quietly into the dark.",
	"{name} melts into the background...",
	"{name} is now lurking. Eyes open, presence unknown.",
	"{name} drifts into the void.",
	"{name} disappears... but not really.",
	"{name} slips into stealth mode.",
	"{name} retreats to the shadows.",
	"{name} becomes one with the lurking.",
	"{name} is now observing from the darkness.",
	"{name} vanishes into the ether.",
	"{name} is lurking... watching... waiting...",
	"{name} quietly dissolves into the background noise.",
	"{name} ducks into the shadows like a professional.",
	"{name} has entered lurk mode.",
	"{name} is now a shadow among shadows.",
	"{name} steps back... but never truly leaves.",
	"{name} fades out of sight.",
	"{name} becomes a silent witness.",
	"{name} slips away, unseen.",
];

let lastMessageIndex = -1;

function getRandomLurkMessage(name: string): string {
	let index: number;

	do {
		index = Math.floor(Math.random() * LURK_MESSAGES.length);
	} while (index === lastMessageIndex && LURK_MESSAGES.length > 1);

	lastMessageIndex = index;

	return LURK_MESSAGES[index].replace('{name}', name);
}

export default class LurkCommand implements TwitchCommand {
	public matches(message: string): boolean {
		return startsWithPrefix(message, LURK_PREFIX);
	}

	public async execute(context: CommandContext): Promise<void> {
		const result = context.lurkService.markLurking(context.userState);
		context.say(getRandomLurkMessage(result.lurker.displayName));
	}
}