import inquirer from "inquirer";
import { $, chalk, echo } from "zx";

console.log("Hello, world!");

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
          if (baseStackNames.includes(input)) {
            return "This base stack name has already been provided. Please provide a different one.";
          }
          return true;
        },
      },
    ]);
    baseStackNames.push(baseStackName);

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
    const stsMockStackName = `${stackName}-sts-mock`;
    const backendStackName = `${stackName}-async-backend`;
    const backendCfStackName = `${stackName}-async-backend-cf-dist`;

    try {
      await doesStackExist(stsMockStackName);
      candidates.push(stsMockStackName);
    } catch (error) {
      console.log(
        `No stsMock stack found when using base stack name: ${stackName}`,
      );
    }

    try {
      await doesStackExist(backendStackName);
      candidates.push(backendStackName);
    } catch (error) {
      console.log(
        `No backend stack found  when using base stack name: ${stackName}`,
      );
    }

    try {
      await doesStackExist(backendCfStackName);
      candidates.push(backendCfStackName);
    } catch (error) {
      console.log(
        `No backend cf dist stack found when using base stack name: ${stackName}`,
      );
    }
  }

  return candidates;
};

const selectStacksToDelete = async (
  candidates: string[],
): Promise<string[]> => {
  const { stacksToDelete } = await inquirer.prompt<{
    stacksToDelete: string[];
  }>([
    {
      type: "checkbox",
      name: "stacksToDelete",
      message: "Confirm which of the following stacks you want to delete",
      choices: candidates,
    },
  ]);

  return stacksToDelete;
};

const prioritiseStacks = (candidates: string[]): PrioritisedStacks => {
  const stacksToDeleteOrder01: string[] = [];
  const stacksToDeleteOrder02: string[] = [];

  for (const stackName of candidates) {
    if (stackName.includes("cf-dist")) {
      stacksToDeleteOrder02.push(stackName);
    } else {
      stacksToDeleteOrder01.push(stackName);
    }
  }
  console.log("01", stacksToDeleteOrder01);
  console.log("02", stacksToDeleteOrder02);

  return {
    stacksToDeleteOrder01,
    stacksToDeleteOrder02,
  };
};

const confirmStacks = async (stacks: string[]): Promise<void> => {
  console.log("You are about to delete the following stacks:");
  stacks.forEach((stackName) => console.log(`- ${stackName}`));

  const { isHappy } = await inquirer.prompt<{ isHappy: boolean }>([
    {
      type: "confirm",
      name: "isHappy",
      message: "Are you happy to continue?",
      default: true,
    },
  ]);
  if (!isHappy) {
    console.log("Exiting script as requested.");
    process.exit(0);
  } else {
    console.log("Continuing with the script...");
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
  const { stacksToDeleteOrder01, stacksToDeleteOrder02 } = stacks;

  await Promise.all(
    stacksToDeleteOrder01.map(async (stackName) => {
      echo(`Deleting stack: ${stackName}`);
      await deleteStack(stackName);
      echo(chalk.bold(`${stackName} deleted`));
    }),
  );

  await Promise.all(
    stacksToDeleteOrder02.map(async (stackName) => {
      echo(`Deleting stack: ${stackName}`);
      await deleteStack(stackName);
      echo(chalk.bold(`${stackName} deleted`));
    }),
  );
};

try {
  const stacks = await getStacks();
  console.log("stacks", stacks);
  await deleteStacks(stacks);
} catch (error: unknown) {
  console.log("There was an error. Error:", error);
}

interface PrioritisedStacks {
  stacksToDeleteOrder01: string[];
  stacksToDeleteOrder02: string[];
}
