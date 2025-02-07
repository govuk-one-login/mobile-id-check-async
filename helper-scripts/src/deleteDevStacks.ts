import inquirer from "inquirer";
import { $, chalk, echo } from "zx";

export const protectedStacks = [
  "mob-sts-mock",
  "mob-sts-mock-tir",
  "mob-sts-mock-pl",
  "mob-async-backend",
  "mob-async-backend-tir",
  "mob-async-backend-pl",
  "mob-async-backend-cf-dist",
];

const getBaseStackNames = async (): Promise<string[]> => {
  const baseStackNames: string[] = [];
  let addAnother = true;
  while (addAnother) {
    const { baseStackName } = await inquirer.prompt<{ baseStackName: string }>([
      {
        type: "input",
        name: "baseStackName",
        message: "Provide a base stack name:",
        validate: (input: string) => {
          if (!input.trim()) {
            return "Answer cannot be empty!";
          }
          if (baseStackNames.includes(input)) {
            return "This base stack name has already been provided. Please provide a different one.";
          }
          return true;
        },
      },
    ]);
    baseStackNames.push(baseStackName);

    echo("");
    const { continueChoice } = await inquirer.prompt<{
      continueChoice: string;
    }>([
      {
        type: "list",
        name: "continueChoice",
        message: "Do you want to add another base stack name?",
        choices: ["Yes", "No"],
      },
    ]);
    if (continueChoice === "No") {
      addAnother = false;
    }
  }
  return baseStackNames;
};

const doesStackExist = async (stackName: string): Promise<void> => {
  await $`aws cloudformation describe-stacks --stack-name ${stackName} 2>/dev/null`;
};

const getStackCandidates = async (
  baseStackNames: string[],
): Promise<string[]> => {
  const candidates: string[] = [];

  for (const stackName of baseStackNames) {
    const testResourcesStackName = `${stackName}-test-resources`;
    const backendStackName = `${stackName}-async-backend`;
    const backendCfStackName = `${stackName}-async-backend-cf-dist`;

    try {
      await doesStackExist(testResourcesStackName);
      candidates.push(testResourcesStackName);
    } catch (error) {
      echo(
        chalk.dim(
          `No testResources stack found when using base stack name: ${stackName}`,
        ),
      );
    }

    try {
      await doesStackExist(backendStackName);
      candidates.push(backendStackName);
    } catch (error) {
      echo(
        chalk.dim(
          `No backend stack found when using base stack name: ${stackName}`,
        ),
      );
    }

    try {
      await doesStackExist(backendCfStackName);
      candidates.push(backendCfStackName);
    } catch (error) {
      echo(
        chalk.dim(
          `No backend cf dist stack found when using base stack name: ${stackName}`,
        ),
      );
    }
  }

  return candidates;
};

const selectStacksToDelete = async (
  candidates: string[],
): Promise<string[]> => {
  echo("");
  let answer;

  try {
    answer = await inquirer.prompt<{
      stacksToDelete: string[];
    }>([
      {
        type: "checkbox",
        name: "stacksToDelete",
        message: "Confirm which of the following stacks you want to delete",
        choices: candidates,
      },
    ]);
  } catch (error) {
    echo(chalk.red("Error selecting stacks to delete. Error: ", error));
    process.exit(1);
  }
  return answer.stacksToDelete;
};

const prioritiseStacks = (candidates: string[]): PrioritisedStacks => {
  const stacksToDeleteOrder01: string[] = [];
  const stacksToDeleteOrder02: string[] = [];
  const stacksToDeleteOrder03: string[] = [];

  for (const stackName of candidates) {
    if (stackName.includes("cf-dist")) {
      stacksToDeleteOrder03.push(stackName);
    } else if (stackName.includes("test-resources")) {
      stacksToDeleteOrder01.push(stackName);
    } else {
      stacksToDeleteOrder02.push(stackName);
    }
  }

  return {
    stacksToDeleteOrder01,
    stacksToDeleteOrder02,
    stacksToDeleteOrder03,
  };
};

const confirmStacks = async (stacks: string[]): Promise<void> => {
  echo("");
  if (stacks.length === 0) {
    echo(chalk.red("No stacks selected for deletion, please try again"));
    echo("");
    process.exit(1);
  }
  echo(chalk.bold("You are about to delete the following stacks:"));
  stacks.forEach((stackName) => console.log(`- ${stackName}`));

  echo("");
  const { isHappy } = await inquirer.prompt<{ isHappy: boolean }>([
    {
      type: "confirm",
      name: "isHappy",
      message: "Are you happy to continue?",
      default: true,
    },
  ]);
  if (!isHappy) {
    echo("");
    echo(chalk.yellow("Exiting script as requested."));
    process.exit(0);
  } else {
    echo("Continuing with the script...");
  }
};

const checkIfProtectedStack = (stacks: string[], protectedStacks: string[]) => {
  stacks.forEach(async (stackName) => {
    if (protectedStacks.includes(stackName)) {
      echo(chalk.red(`It is not permitted to delete stack: ${stackName}`));
      echo(chalk.red("Please remove this stack before continuing"));
      process.exit(1);
    }
    return;
  });
};

const getStacks = async (): Promise<PrioritisedStacks> => {
  const selectedStacks: string[] = [];

  const baseStackName = await getBaseStackNames();
  const candidates = await getStackCandidates(baseStackName);
  selectedStacks.push(...(await selectStacksToDelete(candidates)));
  await confirmStacks(selectedStacks);
  await checkIfProtectedStack(selectedStacks, protectedStacks);

  return prioritiseStacks(selectedStacks);
};

const deleteStack = async (stackName: string): Promise<void> => {
  try {
    await $`./src/james_delete_stack.sh ${stackName}`;
  } catch (error: unknown) {
    echo(chalk.red(`Unable to delete stack: ${stackName}`));
    echo(chalk.red(`Error: ${error}`));
    process.exit(1);
  }
};

const deleteStacks = async (stacks: PrioritisedStacks): Promise<void> => {
  const {
    stacksToDeleteOrder01,
    stacksToDeleteOrder02,
    stacksToDeleteOrder03,
  } = stacks;

  await Promise.all(
    stacksToDeleteOrder01.map(async (stackName) => {
      echo("");
      echo(`Deleting stack: ${stackName}`);
      await deleteStack(stackName);
      echo(chalk.green.bold(`${stackName} stack deleted`));
      echo("");
    }),
  );

  await Promise.all(
    stacksToDeleteOrder02.map(async (stackName) => {
      echo(`Deleting stack: ${stackName}`);
      await deleteStack(stackName);
      echo(chalk.green.bold(`${stackName} stack deleted`));
      echo("");
    }),
  );
  await Promise.all(
    stacksToDeleteOrder03.map(async (stackName) => {
      echo(`Deleting stack: ${stackName}`);
      await deleteStack(stackName);
      echo(chalk.green.bold(`${stackName} stack deleted`));
      echo("");
    }),
  );
};

export const deleteDevStacks = async (): Promise<void> => {
  try {
    const stacks = await getStacks();
    await deleteStacks(stacks);
  } catch (error: unknown) {
    echo(chalk.red("There was an error. Error:", error));
  }
};

interface PrioritisedStacks {
  stacksToDeleteOrder01: string[];
  stacksToDeleteOrder02: string[];
  stacksToDeleteOrder03: string[];
}
