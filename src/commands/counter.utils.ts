import { promises as fs } from 'fs';

export const updateCounter = async (
  filePath: string,
  delta: number
): Promise<number> => {
  const currentValue = await fs.readFile(filePath, 'utf8');
  const nextValue = Number(currentValue.trim()) + delta;
  await fs.writeFile(filePath, nextValue.toString());
  return nextValue;
};
