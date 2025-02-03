#!/bin/bash
set -eu

if ! command -v rain &> /dev/null
then
    echo "Merging templates requires rain to be installed. See https://github.com/aws-cloudformation/rain for installation instructions."
    exit 1
fi

rain merge $(find infra -type f -name "*.yaml" -print) -o template.yaml