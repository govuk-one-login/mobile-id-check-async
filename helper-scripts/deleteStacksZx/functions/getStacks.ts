import { chalk, echo } from "zx";
import { emptyLine } from "../helpers/formatting";

export const getStacks = (stacks: string[][]): string[][] => {
  const result: string[][] = [];
  for (const arr of stacks) {
    if (arr.length > 0) {
      result.push(arr);
    }
  }

  if (result.length === 0) {
    echo(chalk.yellow("No stacks to delete!"));
    emptyLine();
    process.exit(1);
  }
  return result;
};
