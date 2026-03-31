export const startsWithPrefix = (
  message: string,
  prefix: string | undefined
): boolean => !!prefix && message.startsWith(prefix);

export const removePrefix = (message: string, prefix: string): string =>
  message.length === prefix.length
    ? ''
    : message.substring(prefix.length).trimStart();
