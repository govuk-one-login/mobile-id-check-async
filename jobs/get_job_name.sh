#!/bin/bash
set -eu

job_name=$1
job_name=${job_name#".github/jobs/"}
job_name=${job_name%".yml"}
job_name=${job_name%".yaml"}

echo $job_name
