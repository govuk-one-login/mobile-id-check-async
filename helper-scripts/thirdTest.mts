#!/usr/bin/env zx

import { $, echo } from 'zx'
import { deleteStacks } from './deleteStackUtils/deleteStacks'
import { validateStacks } from './deleteStackUtils/validateStacks'

$.quiet = true

const protectedStacks = ["mob-sts-mock", "mob-async-backend", "mob-async-backend-cf-dist"]

const stsMockStacksToDelete = ["james-1-sts-mock"]
const backendStacksToDelete = ["james-1-async-backend"]
const backendCfStacksToDelete = ["james-1-async-backend-cf-dist"]
const stacksToDelete = [stsMockStacksToDelete, backendStacksToDelete, backendCfStacksToDelete]

await validateStacks(stacksToDelete, protectedStacks)
await deleteStacks(stacksToDelete)

echo("")
echo(`Stack deletion script has completed!`)
