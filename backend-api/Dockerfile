FROM node:iron-alpine

WORKDIR /backend-api

# Create a new user 'test' to avoid running the app as a root
RUN adduser --disabled-password test && chown test .

COPY package.json package-lock.json ./
RUN npm install --ignore-scripts


## Update container, install awscli and check awscli is installed correctly
RUN apk upgrade && apk update; apk add --no-cache bash aws-cli && aws --version

# Copy the CloudFormation infrastructure template and application source code to the working directory
COPY src ./src
COPY tests ./tests
COPY template.yaml openApiSpecs eslint.config.mjs jest.config.ts tsconfig.json ./

# Give user, 'test', permissions to execute test script and switch the user to 'test'
COPY run-tests.sh /
RUN chmod 005 /run-tests.sh
USER test

ENTRYPOINT ["/run-tests.sh"]
