# syntax=docker/dockerfile:1

FROM node:22-alpine

WORKDIR /backend-api

# Create a new user 'test' to avoid running the app as a root
RUN adduser --disabled-password test && chown test .

COPY package.json package-lock.json .npmrc ./
RUN --mount=type=secret,id=NPM_TOKEN,env=NPM_TOKEN npm install --ignore-scripts


## Update container, install awscli and check awscli is installed correctly
RUN apk upgrade && apk update; apk add --no-cache bash aws-cli && aws --version

# Copy the test files and the configuration files
COPY tests/testUtils ./tests/testUtils
COPY tests/api-tests ./tests/api-tests
COPY jest.config.ts tsconfig.json ./

# Give user, 'test', permissions to execute test script and switch the user to 'test'
COPY run-tests.sh /
RUN chmod 005 /run-tests.sh
USER test

ENTRYPOINT ["/run-tests.sh"]
