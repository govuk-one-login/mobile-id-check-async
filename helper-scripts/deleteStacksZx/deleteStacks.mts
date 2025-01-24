#!/usr/bin/env zx

import { $, chalk, echo } from 'zx'
import { deleteStacks } from './functions/deleteStacks'
import { validateStacks } from './functions/validateStacks'
import { stsMockStacksToDelete, backendStacksToDelete, backendCfStacksToDelete } from './stacksToDelete'
import { protectedStacks } from './functions/protectedStacks'
import { getStacksToDelete } from './functions/getStacksToDelete'
import { emptyLine } from './functions/formatting'

$.quiet = true

const stacksToDelete = getStacksToDelete([stsMockStacksToDelete, backendStacksToDelete, backendCfStacksToDelete])

await validateStacks(stacksToDelete, protectedStacks)
await deleteStacks(stacksToDelete)

emptyLine()
echo(chalk.green(`Stack deletion script has completed!`))
