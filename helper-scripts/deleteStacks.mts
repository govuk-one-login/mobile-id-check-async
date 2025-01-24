#!/usr/bin/env zx

import { $, echo } from 'zx'
import { deleteStacks } from './deleteStackUtils/deleteStacks'
import { validateStacks } from './deleteStackUtils/validateStacks'
import { stsMockStacksToDelete, backendStacksToDelete, backendCfStacksToDelete } from './deleteStackUtils/stacksToDelete'
import { protectedStacks } from './deleteStackUtils/protectedStacks'

$.quiet = true

const stacksToDelete = [stsMockStacksToDelete, backendStacksToDelete, backendCfStacksToDelete]

await validateStacks(stacksToDelete, protectedStacks)
await deleteStacks(stacksToDelete)

echo("")
echo(`Stack deletion script has completed!`)
