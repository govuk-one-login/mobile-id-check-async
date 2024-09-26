# Helper scripts

## delete_stack.sh

This script provides the ability to:
- empty and delete any versioned S3 buckets (if present in a SAM application)
- delete the SAM application

```bash
export STACK_NAME=backend-stack-name    (REQUIRED)
export TMP_DIR=./tmp                    (OPTIONAL)
./delete_stack.sh
```