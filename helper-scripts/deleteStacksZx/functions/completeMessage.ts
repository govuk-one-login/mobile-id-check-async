import { chalk, echo } from "zx";
import { emptyLine } from "../helpers/formatting";

export const completeMessage = (): void => {
  emptyLine();
  echo(chalk.green(`Stack deletion complete!`));
};
