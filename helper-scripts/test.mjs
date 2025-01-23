#!/usr/bin/env zx

$.quiet = true

echo("hello")

const checkStackExists = async (stackName) => {
  try {
    await $`aws cloudformation describe-stacks --stack-name ${stackName}`;
  } catch (error) {
    if (error.stderr.includes("does not exist")) {
      echo(`this stack don't exist partner: ${error}`);
      process.exit(1)
    } else {
      echo ("some different error happened")
      process.exit(1)
    }
  }
  return
}

await checkStackExists("mob-async-backend")

echo(`finish!, the stack name was great`)
