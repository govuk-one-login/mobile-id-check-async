import { $, echo, question } from "zx";
import { emptyLine, twoEmptyLines } from "./formatting";

const checkIfProtectedStack = (
  stacks: string[][],
  protectedStacks: string[],
) => {
  for (const arr of stacks) {
    arr.forEach(async (stackName) => {
      if (protectedStacks.includes(stackName)) {
        echo(`It is not permitted to delete stack: ${stackName}`);
        echo("Please remove this stack before continuing");
        emptyLine();
        process.exit(1);
      }
      return;
    });
  }
};

const confirmStackNames = async (stacks: string[][]): Promise<void> => {
  echo("Please confirm you are happy to delete the following stacks...");
  for (const arr of stacks) {
    emptyLine();
    arr.forEach((stackName) => {
      echo(stackName);
    });
    emptyLine();
    const areStacksCorrect = (
      await question("Are you sure you want to delete these stacks? [Y/n]")
    )
      .trim()
      .toLowerCase();
    emptyLine();

    if (areStacksCorrect === "n") {
      emptyLine();
      echo("Please update stack names and try again");
      process.exit(1);
    }
  }
};

const checkStackExists = async (stacks: string[][]): Promise<void> => {
  for (const arr of stacks) {
    arr.forEach(async (stackName) => {
      try {
        await $`aws cloudformation describe-stacks --stack-name ${stackName}`;
      } catch (error: unknown) {
        twoEmptyLines();
        echo(`Cannot find stack: ${stackName}`);
        emptyLine();
        echo(`Error: ${error}`);
        process.exit(1);
      }
      return;
    });
  }
};

export const validateStacks = async (
  stacks: string[][],
  protectedStacks: string[],
): Promise<void> => {
  checkIfProtectedStack(stacks, protectedStacks);
  await confirmStackNames(stacks);
  await checkStackExists(stacks);
};
