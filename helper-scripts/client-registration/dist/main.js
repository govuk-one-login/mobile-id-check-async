import { selectAwsEnvironment } from "./application/awsAccount.js";
console.log("starting app");
await selectAwsEnvironment();
