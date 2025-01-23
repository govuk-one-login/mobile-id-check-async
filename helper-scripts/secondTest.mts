#!/usr/bin/env zx

import { $, echo } from 'zx'

$.quiet = true

echo("hello")

const checkStackExists = async (stackName: string): Promise<void> => {
  try {
    await $`aws cloudformation describe-stacks --stack-name ${stackName}`;
  } catch (error: unknown) {
      echo(`there was a problem partner partner: ${error}`);
      process.exit(1)
  }
  return
}

await checkStackExists("mob-async-backend")

echo(`finish!, the stack name was great`)
