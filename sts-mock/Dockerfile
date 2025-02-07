FROM node:iron-alpine

RUN adduser --disabled-password test
RUN chown test .

RUN apk upgrade && apk update; apk add --no-cache bash aws-cli && aws --version

WORKDIR /sts-mock

COPY package.json package-lock.json ./
RUN npm clean-install --no-scripts

COPY tests/ ./tests/
COPY jest.config.ts tsconfig.json ./

COPY run-tests.sh /
RUN chmod 005 /run-tests.sh
USER test

ENTRYPOINT ["/run-tests.sh"]
