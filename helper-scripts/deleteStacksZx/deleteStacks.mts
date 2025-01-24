#!/usr/bin/env zx

import { $, chalk, echo } from 'zx'
import { deleteStacks } from './deleteStackUtils/deleteStacks'
import { validateStacks } from './deleteStackUtils/validateStacks'
import { stsMockStacksToDelete, backendStacksToDelete, backendCfStacksToDelete } from './stacksToDelete'
import { protectedStacks } from './deleteStackUtils/protectedStacks'
import { getStacksToDelete } from './deleteStackUtils/getStacksToDelete'
import { emptyLine } from './deleteStackUtils/formatting'

$.quiet = true

const stacksToDelete = getStacksToDelete([stsMockStacksToDelete, backendStacksToDelete, backendCfStacksToDelete])

await validateStacks(stacksToDelete, protectedStacks)
await deleteStacks(stacksToDelete)

emptyLine()
echo(chalk.green(`Stack deletion script has completed!`))
