#!/bin/bash
set -eu

cd ..

NEW_VERSION=$( yq .description $1 )

job_name=$1
job_name=${job_name#".github/jobs/"}
job_name=${job_name%".yml"}
job_name=${job_name%".yaml"}

OLD_VERSION=$( git tag --list "$job_name/*" | tail -n 1 | cut -d "/" -f 2 )

echo "old version: $OLD_VERSION"
echo "new version: $NEW_VERSION"

if [[ $OLD_VERSION == $NEW_VERSION ]]; then
    echo "No new version provided. Please check and try again."
    exit 1
fi

OLD_MAJOR=$( echo "$OLD_VERSION" | cut -d "." -f 1 )
NEW_MAJOR=$( echo "$NEW_VERSION" | cut -d "." -f 1 )

OLD_MINOR=$( echo "$OLD_VERSION" | cut -d "." -f 2 )
NEW_MINOR=$( echo "$NEW_VERSION" | cut -d "." -f 2 )

OLD_PATCH=$( echo "$OLD_VERSION" | cut -d "." -f 3 )
NEW_PATCH=$( echo "$NEW_VERSION" | cut -d "." -f 3 )

if [[ $(( $OLD_MAJOR + 1 )) == $NEW_MAJOR ]]; then
    if [[ $NEW_MINOR != 0 ]]; then
        echo "Error: This is an invalid major update. If major update, minor and patch should reset to 0."
        exit 1
    fi
    echo "This is a valid major update."
elif [[ $(( $OLD_MINOR + 1 )) == $NEW_MINOR ]]; then
    if [[ $NEW_PATCH -ne 0 ]]; then
        echo "Error: This is an invalid minor update. If minor update, patch should reset to 0."
        exit 1
    fi
    echo "This is a valid minor update."
elif [[ $(( $OLD_PATCH + 1 )) == $NEW_PATCH ]]; then
    echo "This is a valid patch update."
else
    echo "Error: This is an invalid update. Please check and try again."
    exit 1
fi
