import {
  getDeleteStackApplicationFromStackMethod,
  getDeleteStackMethodFromPrompt as getDeleteStackMethodFromPrompt,
} from "./application/methods/stackMethod.js";
import {
  deleteStacks,
  getDeployedStackNames,
} from "./common/cloudformation.js";
import { assertUserIdentity } from "./common/validateUser.js";

await assertUserIdentity();

const deployedStackNames = await getDeployedStackNames();

const deleteStackMethod = await getDeleteStackMethodFromPrompt();
const deleteStackApplication =
  getDeleteStackApplicationFromStackMethod(deleteStackMethod);

const stackNamesToDelete =
  await deleteStackApplication.getNames(deployedStackNames);

const results = await deleteStacks(stackNamesToDelete);

console.log(results);
console.log("Stack deletion complete");
