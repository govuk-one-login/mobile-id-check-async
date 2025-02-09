import { echo } from "zx";
import { $ } from "zx";
import { pleaseTryAgainErrorMessage } from "../../common/prompts.js";
import {
  successfullyGeneratedBothEnvsMessage,
  successfullyGeneratedEnvMessage,
} from "./prompts.js";

export const generateEnvs = async (
  baseStackName: string,
  choice: string,
): Promise<void> => {
  if (choice === "Both") {
    try {
      echo("");
      await generateEnv("../backend-api", baseStackName);
      await generateEnv("../sts-mock", baseStackName);
    } catch {
      pleaseTryAgainErrorMessage();
      process.exit(1);
    }
    successfullyGeneratedBothEnvsMessage(baseStackName);
  }

  if (choice.includes("-async-backend")) {
    try {
      await generateEnv("../backend-api", baseStackName);
    } catch {
      pleaseTryAgainErrorMessage();
      process.exit(1);
    }
    successfullyGeneratedEnvMessage(`${baseStackName}-async-backend`);
  }

  if (choice.includes("-test-resources")) {
    try {
      await generateEnv("../sts-mock", baseStackName);
    } catch {
      pleaseTryAgainErrorMessage();
      process.exit(1);
    }
    successfullyGeneratedEnvMessage(`${baseStackName}-test-resources`);
  }
};

const generateEnv = async (
  dir: string,
  baseStackName: string,
): Promise<void> => {
  await $({
    stdio: "inherit",
  })`cd ${dir} && sh generate_env_file.sh ${baseStackName}`;
};
