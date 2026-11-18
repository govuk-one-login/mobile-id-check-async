#!/usr/bin/env bash
set -eu

echo "Auth Source Check - Endpoint manual tests."
echo "--"
echo "HTTP POST /async/authSourceCheck should:"
echo "1. return status 501"
echo "2. return body containing 'Not Implemented'"

BACKEND_STACK_NAME="${1:-mob}-async-backend"

echo
echo "Running test against ${BACKEND_STACK_NAME}"

SESSIONS_API="https://sessions-${BACKEND_STACK_NAME}.review-b-async.dev.account.gov.uk"
ENDPOINT_URL="${SESSIONS_API}/async/authSourceCheck"

CURL="/usr/bin/curl"
EGREP="/usr/bin/grep -E"
CAT="/bin/cat"

LOGFILE_PREFIX="POST_async_authSourceCheck" # $(basename "$0")
LOGFILE_SUFFIX="$(date -Iseconds)"

LOGFILE=$(mktemp "${LOGFILE_PREFIX}"_"${LOGFILE_SUFFIX}".out)

echo "Logging to ${LOGFILE}"
echo

if ! $CURL -iX POST $ENDPOINT_URL > $LOGFILE 2>&1
then
  echo "Failed to curl ${ENDPOINT_URL}"
  exit 3
fi

if $CAT "$LOGFILE" | $EGREP "HTTP/.* 501" > /dev/null
then
  echo "HTTP status code 501 - PASS"
else
  echo "HTTP status code 501 - FAIL"
  exit 1
fi

if $CAT "$LOGFILE" | $EGREP "Not Implemented" > /dev/null
then
  echo "Result body contains 'Not Implemented' - PASS"
else
  echo "Result body contains 'Not Implemented' - FAIL"
  exit 2
fi
