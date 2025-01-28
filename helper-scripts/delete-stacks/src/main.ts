import {
  getDeleteStackApplicationFromStackMethod,
  getDeleteStackMethodFromPrompt as getDeleteStackMethodFromPrompt,
} from "./application/methods/stackMethod.js";
import { getDeployedStackNames } from "./common/aws/cloudformation.js";
import { assertUserIdentity } from "./common/validateUser.js";

await assertUserIdentity();

const deployedStackNames = await getDeployedStackNames();

const deleteStackMethod = await getDeleteStackMethodFromPrompt();
const deleteStackApplication =
  getDeleteStackApplicationFromStackMethod(deleteStackMethod);

const stackNamesToDelete =
  await deleteStackApplication.getNames(deployedStackNames);

const results = await deleteStackApplication.deleteStacks(stackNamesToDelete);

console.log(results);
console.log("Stack deletion complete");
