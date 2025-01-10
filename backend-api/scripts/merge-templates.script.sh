#!/bin/bash
set -euo pipefail

# Check if rain is installed
if ! command -v rain &> /dev/null; then
    echo "Error: rain is not installed"
    exit 1
fi

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Create temporary directory for template processing
TEMP_DIR=$(mktemp -d)
cleanup() {
    rm -rf "$TEMP_DIR"
}
trap cleanup EXIT

# Copy templates to temp directory maintaining structure
cp -r "$PROJECT_ROOT/cloudFormation" "$TEMP_DIR/"

# Process each template to ensure proper formatting
find "$TEMP_DIR" -name "*.yaml" -type f -exec rain fmt {} --write \;

# Merge templates
rain merge "$TEMP_DIR/cloudFormation/**/*.yaml" \
    --output "$PROJECT_ROOT/template.yaml"

echo "Templates merged successfully to template.yaml"