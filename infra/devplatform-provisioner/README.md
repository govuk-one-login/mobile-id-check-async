# async - devplatform-provisioner

Holds the configuration files for the devplatform-provisioner tool.

Usage instructions: <https://github.com/govuk-one-login/devplatform-provisioner>

## Deployments

| stack name                            | template name/location           | version | envs      | region    | notes                 |
| ------------------------------------- | -------------------------------- | ------- | --------- | --------- | --------------------- |
| devplatform-vpc                       | vpc                              | v2.5.3  | all       |           |                       |
|                                       |                                  |         |           |           |                       |
| devplatform-api-gateway-logs          | api-gateway-logs                 | v1.0.5  | all       |           |                       |
| devplatform-build-notifications       | build-notifications              | v2.3.2  | all       |           |                       |
|                                       |                                  |         |           |           |                       |
| devplatform-checkov-hook              | checkov-hook                     | latest  | all       |           |                       |
| devplatform-infrastructure-audit-hook | infrastructure-audit-hook        | latest  | all       |           |                       |
| devplatform-lambda-audit-hook         | lambda-audit-hook                | latest  | all       |           |                       |
|                                       |                                  |         |           |           |                       |
| devplatform-container-signer          | container-signer                 | v1.1.2  | dev,build |           |                       |
| devplatform-github-identity           | github-identity                  | v1.1.1  | dev,build |           |                       |
| devplatform-signer                    | signer                           | v1.0.8  | dev,build |           |                       |
|                                       |                                  |         |           |           |                       |
| mob-async-backend-pl                  | sam-deploy-pipeline              | v2.68.1 | all       |           |                       |
| mob-async-backend-tir                 | test-image-repository            | v1.1.10 | dev,build |           |                       |
| mob-sts-mock-pl                       | sam-deploy-pipeline              | v2.68.1 | dev,build |           |                       |
| mob-sts-mock-tir                      | test-image-repository            | v1.2.0  | dev,build |           |                       |
|                                       |                                  |         |           |           |                       |
| platform-alarms-chatbot               | ./infra/templates/alarms-chatbot | main    | all       |           |                       |
| platform-alarms-sns                   | ./infra/templates/alarms-sns     | main    | all       |           |                       |
| platform-alarms-sns                   | ./infra/templates/alarms-sns     | main    | all       | us-east-1 |                       |
| platform-dns                          | ./infra/templates/dns            | main    | all       |           |                       |
| platform-kms                          | ./infra/templates/kms            | main    | all       |           | deprecated?           |
|                                       |                                  |         |           |           |                       |
| platform-dns-records                  | ./infra/templates/dns-records    | main    | all       |           | requires platform-dns |
|                                       |                                  |         |           |           |                       |
