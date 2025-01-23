#!/usr/bin/env zx

import { $, echo } from 'zx'

$.quiet = true

echo("hello")

const stacksToDelete = ["james-x-sts-mock", "james-z-sts-mock"]

const checkStackExists = async (stackName: string): Promise<void> => {
  try {
    await $`aws cloudformation describe-stacks --stack-name ${stackName}`;
  } catch (error: unknown) {
    echo(`there was a problem partner when checking stack: ${stackName}. The error was: ${error}`);
    process.exit(1)
  }
  return
}

const deleteStack = async (stackName: string): Promise<void> => {
  try {
    await $`./delete_stack.sh ${stackName}`
  } catch (error: unknown) {
    echo(`error deleting stack ${stackName}. Error: ${error}`)
    process.exit(1)
  }
}

for (const value of stacksToDelete) {
  echo(`Checking if ${value} exists`)
  await checkStackExists(value)
  echo(`Attempting to delete stack: ${value}`)
  await deleteStack(value)
}





echo(`finish!, the stack name was great`)
