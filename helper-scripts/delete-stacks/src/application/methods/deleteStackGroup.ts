import { Results } from "../../common/results.js";
import { Application } from "./stackMethod.js";

export const deleteStackGroupApplication: Application = {
  getNames: async (): Promise<string[]> => {
    throw Error("Not Implemented");
  },
  deleteStacks: async (stackNames: string[]): Promise<Results> => {
    throw new Error("Function not implemented.");
  },
};
