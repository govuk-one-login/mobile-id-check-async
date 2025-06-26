#!/bin/bash

CRED_FILE="./encryptedCredential/pact-credentials.json.gpg"

if [[ ! -f "$CRED_FILE" ]]; then
  echo "Credential file not found at $CRED_FILE"
  exit 1
fi

DECRYPTED=$(gpg --quiet --batch --decrypt "$CRED_FILE")
if [[ $? -ne 0 ]]; then
  echo "Failed to decrypt credential file"
  exit 1
fi

if ! command -v jq &>/dev/null; then
  echo "jq is required but not installed."
  exit 1
fi

export PACT_BROKER_USERNAME=$(echo "$DECRYPTED" | jq -r '.user')
export PACT_BROKER_PASSWORD=$(echo "$DECRYPTED" | jq -r '.password')
export PACT_BROKER_SOURCE_SECRET=$(echo "$DECRYPTED" | jq -r '.source_secret')
export PACT_BROKER_URL="https://pactbroker-onelogin.account.gov.uk"

echo "Exported pact credentials"