#!/usr/bin/env zx

import { $ } from 'zx'
import { completeMessage } from './functions/completeMessage'
import { deleteStacks } from './functions/deleteStacks'
import { getStacksToDelete } from './functions/getStacksToDelete'
import { validateStacks } from './functions/validateStacks'
import { protectedStacks } from './protectedStacks'
import { backendCfStacksToDelete, backendStacksToDelete, stsMockStacksToDelete } from './stacksToDelete'

$.quiet = true

const stacksToDelete = getStacksToDelete([stsMockStacksToDelete, backendStacksToDelete, backendCfStacksToDelete])

await validateStacks(stacksToDelete, protectedStacks)
await deleteStacks(stacksToDelete)
completeMessage()
