#!/bin/bash

# helper-scripts/validate-templates.script.sh
set -euo pipefail

# Define paths relative to script location
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
INFRA_DIR="$PROJECT_ROOT/backend-api/infra"

# Validate all CloudFormation templates
validate_templates() {
    local exit_code=0
    
    echo "Validating templates in $INFRA_DIR"
    
    # Find all CloudFormation templates
    find "$INFRA_DIR" -type f \( -name "*.yaml" -o -name "*.yml" \) | while read -r template; do
        echo "Validating $template..."
        
        # Use AWS CloudFormation validate-template
        if ! aws cloudformation validate-template --template-body "file://$template" > /dev/null; then
            echo "Error: Invalid template: $template"
            exit_code=1
        fi
    done
    
    return $exit_code
}

# Run validation
validate_templates