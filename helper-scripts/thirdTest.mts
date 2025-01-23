#!/usr/bin/env zx

import { $, echo } from 'zx'
import { deleteStacks } from './scriptUtils'

$.quiet = true

echo("hello")

const stsMockStacksToDelete = ["james-x-sts-mock", "james-z-sts-mock"]
const backendStacksToDelete = ["james-x-backend", "james-z-backend"]
const backendCfStacksToDelete = ["james-x-cf-backend", "james-z-cf-backend"]

await deleteStacks([stsMockStacksToDelete, backendStacksToDelete, backendCfStacksToDelete])

echo(`finish!, the stack name was great`)
