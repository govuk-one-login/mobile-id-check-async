#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Validate each template individually
echo "Validating individual templates..."
find "$PROJECT_ROOT/cloudFormation" -name "*.yaml" -type f | while read -r template; do
    echo "Validating $template"
    aws cloudformation validate-template \
        --template-body "file://$template" \
        --output json || exit 1
done

# Validate merged template
echo "Validating merged template..."
aws cloudformation validate-template \
    --template-body "file://$PROJECT_ROOT/template.yaml" \
    --output json || exit 1

echo "All templates validated successfully"

# Compare resources between source and merged templates
python3 "$PROJECT_ROOT/tests/infrastructure/test_templates.py" || exit 1