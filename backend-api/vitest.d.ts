// Required to avoid type errors if moduleResolution in tsconfig is set to "Node"
// https://www.npmjs.com/package/aws-sdk-client-mock-vitest#Typescript-support

import "vitest";
import { CustomMatcher } from "aws-sdk-client-mock-vitest";

// We disable these eslint rules as detailed in the package readme
/* eslint-disable @typescript-eslint/no-empty-object-type */
/* eslint-disable @typescript-eslint/no-explicit-any */
declare module "vitest" {
  interface Matchers<T = any> extends CustomMatcher<T> {}
}
