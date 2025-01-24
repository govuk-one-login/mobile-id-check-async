import { sleep } from "zx";

export const mockValidateStacks = async (
  stacks: string[][],
  protectedStacks: string[],
): Promise<void> => {
  await sleep(1000);
  return;
};

export const mockDeleteStacks = async (stacks: string[][]): Promise<void> => {
  await sleep(2000);
  return;
};
