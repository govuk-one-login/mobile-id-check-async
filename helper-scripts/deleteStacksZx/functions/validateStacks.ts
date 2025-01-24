import { $, chalk, echo, question } from "zx";
import { emptyLine, twoEmptyLines } from "../helpers/formatting";

const checkIfProtectedStack = (
  stacks: string[][],
  protectedStacks: string[],
) => {
  for (const arr of stacks) {
    arr.forEach(async (stackName) => {
      if (protectedStacks.includes(stackName)) {
        echo(chalk.red(`It is not permitted to delete stack: ${stackName}`));
        echo(chalk.red("Please remove this stack before continuing"));
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

    while (true) {
      const areStacksCorrect = (
        await question("Are you sure you want to delete these stacks? [y/n] ")
      )
        .trim()
        .toLowerCase();
      emptyLine();

      if (areStacksCorrect === "n") {
        echo(
          chalk.yellow(
            "Please correct the stack names you want to delete and try again",
          ),
        );
        process.exit(1);
      } else if (areStacksCorrect === "y") {
        break;
      } else {
        echo(chalk.yellow("Please answer either 'y' or 'n'"));
        emptyLine();
      }
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
        echo(chalk.red(`Cannot find stack: ${stackName}`));
        echo(chalk.red(`Error: ${error}`));
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
