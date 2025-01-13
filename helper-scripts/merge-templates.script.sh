#!/bin/bash

# helper-scripts/merge-templates.script.sh
set -euo pipefail

# Define paths relative to script location
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
INFRA_DIR="$PROJECT_ROOT/backend-api/infra"
PARENT_TEMPLATE="$INFRA_DIR/parent.yaml"
OUTPUT_TEMPLATE="$PROJECT_ROOT/backend-api/template.yaml"
TEMP_FILE="$PROJECT_ROOT/backend-api/template.tmp.yaml"

# Function to install rain
install_rain() {
    echo "Rain is not installed. Attempting to install..."
    
    # Detect operating system
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        if ! command -v brew &> /dev/null; then
            echo "Error: Homebrew is required to install rain on macOS"
            echo "Please install Homebrew first: https://brew.sh/"
            exit 1
        fi
        brew tap aws-cloudformation/tap
        brew install rain
    else
        # Linux
        # Download the latest release of rain
        ARCH=$(uname -m)
        case $ARCH in
            x86_64)
                RAIN_ARCH="amd64"
                ;;
            aarch64)
                RAIN_ARCH="arm64"
                ;;
            *)
                echo "Unsupported architecture: $ARCH"
                exit 1
                ;;
        esac
        
        RAIN_VERSION=$(curl -s https://api.github.com/repos/aws-cloudformation/rain/releases/latest | grep tag_name | cut -d '"' -f 4)
        RAIN_URL="https://github.com/aws-cloudformation/rain/releases/download/${RAIN_VERSION}/rain-${RAIN_VERSION:1}_linux_${RAIN_ARCH}.zip"
        
        echo "Downloading rain from $RAIN_URL"
        curl -L "$RAIN_URL" -o /tmp/rain.zip
        unzip -o /tmp/rain.zip -d /tmp
        sudo mv /tmp/rain /usr/local/bin/
        sudo chmod +x /usr/local/bin/rain
        rm /tmp/rain.zip
    fi
    
    # Verify installation
    if ! command -v rain &> /dev/null; then
        echo "Error: Failed to install rain"
        exit 1
    fi
    
    echo "Rain installed successfully"
}

# Check if rain is installed, install if not
if ! command -v rain &> /dev/null; then
    install_rain
fi

# Function to merge templates
merge_templates() {
    echo "Merging templates from $INFRA_DIR"
    echo "Source template: $PARENT_TEMPLATE"
    echo "Output template: $OUTPUT_TEMPLATE"
    
    if [ ! -f "$PARENT_TEMPLATE" ]; then
        echo "Error: Parent template not found at $PARENT_TEMPLATE"
        exit 1
    fi
    
    # Create backend-api directory if it doesn't exist
    mkdir -p "$(dirname "$OUTPUT_TEMPLATE")"
    
    # Merge using rain
    rain fmt "$PARENT_TEMPLATE" > "$TEMP_FILE"
    
    if [ $? -eq 0 ]; then
        mv "$TEMP_FILE" "$OUTPUT_TEMPLATE"
        echo "Successfully merged templates into $OUTPUT_TEMPLATE"
    else
        echo "Error: Failed to merge templates"
        rm -f "$TEMP_FILE"
        exit 1
    fi
}

# Function to verify merged template
verify_templates() {
    echo "Verifying template consistency..."
    
    if [ ! -f "$PARENT_TEMPLATE" ]; then
        echo "Error: Parent template not found at $PARENT_TEMPLATE"
        exit 1
    fi
    
    if [ ! -f "$OUTPUT_TEMPLATE" ]; then
        echo "Error: Output template not found at $OUTPUT_TEMPLATE"
        exit 1
    fi
    
    # Generate a new merge
    rain fmt "$PARENT_TEMPLATE" > "$TEMP_FILE"
    
    # Compare with existing template
    if diff -q "$OUTPUT_TEMPLATE" "$TEMP_FILE" >/dev/null; then
        echo "Verification passed: Templates are in sync"
        rm -f "$TEMP_FILE"
        return 0
    else
        echo "Error: Templates are out of sync. Please run merge-templates.script.sh"
        echo "Diff:"
        diff "$OUTPUT_TEMPLATE" "$TEMP_FILE" || true
        rm -f "$TEMP_FILE"
        return 1
    fi
}

# Main execution
case "${1:-merge}" in
    "merge")
        merge_templates
        ;;
    "verify")
        verify_templates
        ;;
    *)
        echo "Usage: $0 [merge|verify]"
        exit 1
        ;;
esac