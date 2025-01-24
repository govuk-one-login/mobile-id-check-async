#!/usr/bin/env zx

import { $, echo } from 'zx'
import { deleteStacks, validateStacks } from './scriptUtils'

$.quiet = true

const stsMockStacksToDelete = ["james-x-sts-mock", "james-z-sts-mock"]
const backendStacksToDelete = ["james-x-backend", "james-z-backend"]
const backendCfStacksToDelete = ["james-x-cf-backend", "james-z-cf-backend"]
const stacksToDelete = [stsMockStacksToDelete, backendStacksToDelete, backendCfStacksToDelete]

await validateStacks(stacksToDelete)
await deleteStacks(stacksToDelete)

echo("")
echo(`Stack deletion script has completed!`)
