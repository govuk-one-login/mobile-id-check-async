#!/bin/bash
set -eu

cd ..

JOB_NAME=$( yq .name $1 )
new_version=$( yq .description $1 | jq .version | tr -d '"' )

old_version=$( git tag --list "$JOB_NAME/*" | tail -n 1 | cut -d "/" -f 2 )

echo "old version: $old_version"
echo "new version: $new_version"

if [[ $old_version == $new_version ]]; then
    echo "No new version provided. Please check and try again."
    exit 1
fi

old_version=$( echo "$old_version" | cut -d "v" -f 2 )
new_version=$( echo "$new_version" | cut -d "v" -f 2 )

OLD_MAJOR=$( echo "$old_version" | cut -d "." -f 1 )
NEW_MAJOR=$( echo "$new_version" | cut -d "." -f 1 )

OLD_MINOR=$( echo "$old_version" | cut -d "." -f 2 )
NEW_MINOR=$( echo "$new_version" | cut -d "." -f 2 )

OLD_PATCH=$( echo "$old_version" | cut -d "." -f 3 )
NEW_PATCH=$( echo "$new_version" | cut -d "." -f 3 )

if [[ $(( $OLD_MAJOR + 1 )) == $NEW_MAJOR ]]; then
    if [[ $NEW_MINOR != 0 || $NEW_PATCH != 0 ]]; then
        echo "Error: This is an invalid major update. If major update, minor and patch should reset to 0."
        exit 1
    fi
    echo "This is a valid major update."
elif [[ $(( $OLD_MINOR + 1 )) == $NEW_MINOR ]]; then
    if [[ $NEW_PATCH != 0 ]]; then
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
