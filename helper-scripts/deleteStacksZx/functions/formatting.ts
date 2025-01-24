import { echo } from "zx";

export const emptyLine = (): void => {
  echo("");
};

export const twoEmptyLines = (): void => {
  emptyLine();
  emptyLine();
};
