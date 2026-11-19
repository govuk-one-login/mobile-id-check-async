#!/usr/bin/env bash
set -eu

echo "Auth Source Check - Endpoint manual tests."
echo "--"
echo "HTTP POST /async/authSourceCheck should:"
echo "- Given a badly-formned request body:"
echo "  1. return status 400"
echo "  2. return body containing 'invalid_request'"

BACKEND_STACK_NAME="${1:-mob}-async-backend"

echo
echo "Running test against ${BACKEND_STACK_NAME}"

SESSIONS_API="https://sessions-${BACKEND_STACK_NAME}.review-b-async.dev.account.gov.uk"
ENDPOINT_URL="${SESSIONS_API}/async/authSourceCheck"

CURL="/usr/bin/curl"
EGREP="/usr/bin/grep -E"
CAT="/bin/cat"

LOGFILE_PREFIX="POST_async_authSourceCheck"
LOGFILE_SUFFIX="$(date -Iseconds)"

LOGFILE=$(mktemp "${LOGFILE_PREFIX}"_"${LOGFILE_SUFFIX}".out)

echo "Logging to ${LOGFILE}"
echo

INPUT_FILE=$(mktemp "${LOGFILE_PREFIX}"_"${LOGFILE_SUFFIX}".in)

cat <<- EOF > $INPUT_FILE
{
  "sessionId": "fe4b8e97-fe75-4a61-b85e-f0a2c5cea446",
  "opaqueId": "4c5f83fc-4fae-41bf-88f9-03730119c77f",
  "otherFields": "omitted"
}
EOF

CURL_COMMAND="$CURL -iX POST $ENDPOINT_URL -H 'Content-Type: application/json' -d @$INPUT_FILE"
echo "Executing: ${CURL_COMMAND}"
echo

if ! $CURL -iX POST $ENDPOINT_URL -H 'Content-Type: application/json' -d @$INPUT_FILE > $LOGFILE 2>&1
then
  echo "Failed to curl ${ENDPOINT_URL}"
  exit 3
fi

if $CAT "$LOGFILE" | $EGREP "HTTP/.* 400" > /dev/null
then
  echo "HTTP status code 400 - PASS"
else
  echo "HTTP status code 400 - FAIL"
  exit 1
fi

if $CAT "$LOGFILE" | $EGREP "invalid_request" > /dev/null
then
  echo "Result body contains 'invalid_request' - PASS"
else
  echo "Result body contains 'invalid_request' - FAIL"
  exit 2
fi
