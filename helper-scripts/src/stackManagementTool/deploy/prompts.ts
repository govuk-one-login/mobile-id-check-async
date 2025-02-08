import { chalk, echo } from "zx";

export const runningToolMessage = (): void => {
  echo(chalk.italic("Running stack deployment tool..."));
  echo("");
};
