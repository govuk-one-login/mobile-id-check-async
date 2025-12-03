#!/bin/bash
set -eu

{
  echo 'engine-strict=true'
  echo 'ignore-scripts=true'
  echo '@govuk-one-login:registry=https://npm.pkg.github.com/'
  echo '//npm.pkg.github.com/:_authToken=${NPM_TOKEN}'
} > .npmrc