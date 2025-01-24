#!/usr/bin/env zx

import { $ } from 'zx'
import { deleteStacks } from './functions/deleteStacks'
import { validateStacks } from './functions/validateStacks'
import { stsMockStacksToDelete, backendStacksToDelete, backendCfStacksToDelete } from './stacksToDelete'
import { protectedStacks } from './protectedStacks'
import { getStacksToDelete } from './functions/getStacksToDelete'
import { completeMessage } from './functions/completeMessage'

$.quiet = true

const stacksToDelete = getStacksToDelete([stsMockStacksToDelete, backendStacksToDelete, backendCfStacksToDelete])

await validateStacks(stacksToDelete, protectedStacks)
await deleteStacks(stacksToDelete)
completeMessage()
