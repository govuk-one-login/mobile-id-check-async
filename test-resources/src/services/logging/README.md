# Logging

## When to log:

Logs should only be added for error scenarios - either through requests that don't pass validation, or for unexpected errors.

There are two logs that do not follow this pattern - the STARTED and COMPLETED logs. These logs are useful to analyse whether a lambda has finished executing successfully.

Careful considering should be given if other logs that do not follow this pattern are added.

## Reference for registering logs:

Logs should be registered within the folder for the given lambda.

## How to implement new Powertool methods

1) Update the ILogger interface in logger.ts with a method from AWS Powertools

2) Call the method using the private logger property within the Logger class


## Further reading:

- AWS Powertools logger: https://docs.powertools.aws.dev/lambda/python/latest/core/logger/

