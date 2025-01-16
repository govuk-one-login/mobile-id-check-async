FROM node:iron-alpine AS builder

COPY package.json package-lock.json /
RUN npm install --ignore-scripts

FROM node:iron-alpine AS final

RUN adduser --disabled-password test
RUN chown test .

RUN apk upgrade && apk update; apk add --no-cache bash aws-cli && aws --version

COPY --from=builder package.json sts-mock/
COPY --from=builder node_modules sts-mock/node_modules

COPY tests/ sts-mock/tests/
COPY jest.config.ts tsconfig.json sts-mock/

COPY run-tests.sh /
RUN chmod 005 /run-tests.sh
USER test

ENTRYPOINT ["/run-tests.sh"]
