import { Capture, Match, Template } from "aws-cdk-lib/assertions";
import { readFileSync } from "fs";
import { load } from "js-yaml";
import { Mappings } from "./helpers/mappings";

const { schema } = require("yaml-cfn");

describe("Backend application infrastructure", () => {
  let template: Template;
  
  beforeEach(() => {
    let yamltemplate: any = load(readFileSync("template.yaml", "utf-8"), {
      schema: schema,
    });
    template = Template.fromJSON(yamltemplate);
  });

  describe("EnvironmentVariable mapping values", () => {
    test("STS base url only assigned to Dev and Build", () => {
      const expectedEnvironmentVariablesValues = {
        dev: "https://mob-sts-mock.review-b-async.dev.account.gov.uk",
        build: "https://mob-sts-mock.review-b-async.build.account.gov.uk",
        staging: "",
        integration: "",
        production: "",
      };

      const mappingHelper = new Mappings(template);
      mappingHelper.validateEnvironmentVariablesMapping({
        environmentFlags: expectedEnvironmentVariablesValues,
        mappingBottomLevelKey: "STSBASEURL",
      });
    });

    test("Biometric submitter key paths are environment specific", () => {
      const expectedPassportPaths = {
        dev: "/dev/BIOMETRIC_SUBMITTER_ACCESS_KEY_NFC_PASSPORT",
        build: "/build/BIOMETRIC_SUBMITTER_ACCESS_KEY_NFC_PASSPORT",
        staging: "/staging/BIOMETRIC_SUBMITTER_ACCESS_KEY_NFC_PASSPORT",
        integration: "/integration/BIOMETRIC_SUBMITTER_ACCESS_KEY_NFC_PASSPORT",
        production: "/production/BIOMETRIC_SUBMITTER_ACCESS_KEY_NFC_PASSPORT"
      };
      const expectedBrpPaths = {
        dev: "/dev/BIOMETRIC_SUBMITTER_ACCESS_KEY_NFC_BRP",
        build: "/build/BIOMETRIC_SUBMITTER_ACCESS_KEY_NFC_BRP",
        staging: "/staging/BIOMETRIC_SUBMITTER_ACCESS_KEY_NFC_BRP",
        integration: "/integration/BIOMETRIC_SUBMITTER_ACCESS_KEY_NFC_BRP",
        production: "/production/BIOMETRIC_SUBMITTER_ACCESS_KEY_NFC_BRP"
      };
      const expectedDlPaths = {
        dev: "/dev/BIOMETRIC_SUBMITTER_ACCESS_KEY_DL",
        build: "/build/BIOMETRIC_SUBMITTER_ACCESS_KEY_DL",
        staging: "/staging/BIOMETRIC_SUBMITTER_ACCESS_KEY_DL",
        integration: "/integration/BIOMETRIC_SUBMITTER_ACCESS_KEY_DL",
        production: "/production/BIOMETRIC_SUBMITTER_ACCESS_KEY_DL"
      };

      const mappingHelper = new Mappings(template);
      mappingHelper.validateEnvironmentVariablesMapping({
        environmentFlags: expectedPassportPaths,
        mappingBottomLevelKey: "BiometricSubmitterKeySecretPathPassport",
      });
      mappingHelper.validateEnvironmentVariablesMapping({
        environmentFlags: expectedBrpPaths,
        mappingBottomLevelKey: "BiometricSubmitterKeySecretPathBrp",
      });
      mappingHelper.validateEnvironmentVariablesMapping({
        environmentFlags: expectedDlPaths,
        mappingBottomLevelKey: "BiometricSubmitterKeySecretPathDl",
      });
    });

    test("Biometric submitter key cache duration is consistent", () => {
      const expectedCacheDuration = {
        dev: 900,
        build: 900,
        staging: 900,
        integration: 900,
        production: 900
      };

      const mappingHelper = new Mappings(template);
      mappingHelper.validateEnvironmentVariablesMapping({
        environmentFlags: expectedCacheDuration,
        mappingBottomLevelKey: "BiometricSubmitterKeySecretCacheDurationInSeconds",
      });
    });

    test("DynamicsSE variables are environment specific", () => {
      const expectedDynatraceSecretArn = {
        dev: "arn:aws:secretsmanager:eu-west-2:216552277552:secret:DynatraceNonProductionVariables",
        build: "arn:aws:secretsmanager:eu-west-2:216552277552:secret:DynatraceNonProductionVariables",
        staging: "arn:aws:secretsmanager:eu-west-2:216552277552:secret:DynatraceNonProductionVariables",
        integration: "arn:aws:secretsmanager:eu-west-2:216552277552:secret:DynatraceNonProductionVariables",
        production: "arn:aws:secretsmanager:eu-west-2:216552277552:secret:DynatraceProductionVariables"
      };

      const mappings = template.findMappings("EnvironmentConfiguration");
      expect(mappings).toStrictEqual({
        EnvironmentConfiguration: {
          dev: { dynatraceSecretArn: expectedDynatraceSecretArn.dev },
          build: { dynatraceSecretArn: expectedDynatraceSecretArn.build },
          staging: { dynatraceSecretArn: expectedDynatraceSecretArn.staging },
          integration: { dynatraceSecretArn: expectedDynatraceSecretArn.integration },
          production: { dynatraceSecretArn: expectedDynatraceSecretArn.production }
        }
      });
    });
  });

  describe("Nested Stacks", () => {
    describe("API Gateway Stacks", () => {
      test("Private API stack has correct parameters", () => {
        template.hasResourceProperties("AWS::CloudFormation::Stack", {
          TemplateURL: "infra/api/privateApi.cloudFormation.yaml",
          Parameters: {
            Environment: { Ref: "Environment" },
            PermissionsBoundary: { Ref: "PermissionsBoundary" },
            StackName: { Ref: "AWS::StackName" },
            ApiBurstLimit: {
              "Fn::FindInMap": ["PrivateApigw", { Ref: "Environment" }, "ApiBurstLimit"]
            },
            ApiRateLimit: {
              "Fn::FindInMap": ["PrivateApigw", { Ref: "Environment" }, "ApiRateLimit"]
            }
          }
        });
      });

      test("Sessions API stack has correct parameters", () => {
        template.hasResourceProperties("AWS::CloudFormation::Stack", {
          TemplateURL: "infra/api/sessionsApi.cloudFormation.yaml",
          Parameters: {
            Environment: { Ref: "Environment" },
            PermissionsBoundary: { Ref: "PermissionsBoundary" },
            StackName: { Ref: "AWS::StackName" },
            ApiBurstLimit: {
              "Fn::FindInMap": ["SessionsApigw", { Ref: "Environment" }, "ApiBurstLimit"]
            },
            ApiRateLimit: {
              "Fn::FindInMap": ["SessionsApigw", { Ref: "Environment" }, "ApiRateLimit"]
            },
            BaseDns: {
              "Fn::FindInMap": ["DNS", { Ref: "Environment" }, "BaseDns"]
            }
          }
        });
      });

      test("Proxy API stack is conditional and has correct parameters", () => {
        template.hasResource("AWS::CloudFormation::Stack", {
          Condition: "ProxyApiDeployment",
          Properties: {
            TemplateURL: "infra/api/proxyApi.cloudFormation.yaml",
            Parameters: {
              Environment: { Ref: "Environment" },
              PermissionsBoundary: { Ref: "PermissionsBoundary" },
              StackName: { Ref: "AWS::StackName" },
              ApiBurstLimit: {
                "Fn::FindInMap": ["ProxyApigw", { Ref: "Environment" }, "ApiBurstLimit"]
              },
              ApiRateLimit: {
                "Fn::FindInMap": ["ProxyApigw", { Ref: "Environment" }, "ApiRateLimit"]
              },
              BaseDns: {
                "Fn::FindInMap": ["DNS", { Ref: "Environment" }, "BaseDns"]
              }
            }
          }
        });
      });
    });

    describe("Function Stacks", () => {
      test("Token Function stack has correct parameters", () => {
        template.hasResourceProperties("AWS::CloudFormation::Stack", {
          TemplateURL: "infra/functions/token.cloudFormation.yaml",
          Parameters: {
            Environment: { Ref: "Environment" },
            PermissionsBoundary: { Ref: "PermissionsBoundary" },
            StackName: { Ref: "AWS::StackName" }
          }
        });
      });

      test("Credential Function stack has correct parameters", () => {
        template.hasResourceProperties("AWS::CloudFormation::Stack", {
          TemplateURL: "infra/functions/credential.cloudFormation.yaml",
          Parameters: {
            Environment: { Ref: "Environment" },
            PermissionsBoundary: { Ref: "PermissionsBoundary" },
            StackName: { Ref: "AWS::StackName" }
          }
        });
      });

      test("Active Session Function stack has correct parameters", () => {
        template.hasResourceProperties("AWS::CloudFormation::Stack", {
          TemplateURL: "infra/functions/activeSession.cloudFormation.yaml",
          Parameters: {
            Environment: { Ref: "Environment" },
            PermissionsBoundary: { Ref: "PermissionsBoundary" },
            StackName: { Ref: "AWS::StackName" }
          }
        });
      });

      test("Biometric Token Function stack has correct parameters", () => {
        template.hasResourceProperties("AWS::CloudFormation::Stack", {
          TemplateURL: "infra/functions/biometricToken.cloudFormation.yaml",
          Parameters: {
            Environment: { Ref: "Environment" },
            PermissionsBoundary: { Ref: "PermissionsBoundary" },
            StackName: { Ref: "AWS::StackName" }
          }
        });
      });

      test("JWKS Function stack has correct parameters", () => {
        template.hasResourceProperties("AWS::CloudFormation::Stack", {
          TemplateURL: "infra/functions/jwks.cloudFormation.yaml",
          Parameters: {
            Environment: { Ref: "Environment" },
            PermissionsBoundary: { Ref: "PermissionsBoundary" },
            StackName: { Ref: "AWS::StackName" }
          }
        });
      });

      test("Proxy Function stack is conditional and has correct parameters", () => {
        template.hasResource("AWS::CloudFormation::Stack", {
          Condition: "ProxyApiDeployment",
          Properties: {
            TemplateURL: "infra/functions/proxy.cloudFormation.yaml",
            Parameters: {
              Environment: { Ref: "Environment" },
              PermissionsBoundary: { Ref: "PermissionsBoundary" },
              StackName: { Ref: "AWS::StackName" }
            }
          }
        });
      });
    });

    describe("Storage Stacks", () => {
      test("DynamoDB stack has correct parameters", () => {
        template.hasResourceProperties("AWS::CloudFormation::Stack", {
          TemplateURL: "infra/storage/dynamodb.cloudFormation.yaml",
          Parameters: {
            Environment: { Ref: "Environment" },
            StackName: { Ref: "AWS::StackName" }
          }
        });
      });

      test("S3 stack has correct parameters", () => {
        template.hasResourceProperties("AWS::CloudFormation::Stack", {
          TemplateURL: "infra/storage/s3.cloudFormation.yaml",
          Parameters: {
            Environment: { Ref: "Environment" },
            StackName: { Ref: "AWS::StackName" }
          }
        });
      });

      test("SQS stack has correct parameters", () => {
        template.hasResourceProperties("AWS::CloudFormation::Stack", {
          TemplateURL: "infra/storage/sqs.cloudFormation.yaml",
          Parameters: {
            Environment: { Ref: "Environment" },
            StackName: { Ref: "AWS::StackName" },
            TxmaAccount: {
              "Fn::FindInMap": ["TxMA", { Ref: "Environment" }, "TxmaAccount"]
            }
          }
        });
      });
    });

    describe("Monitoring Stack", () => {
      test("Monitoring stack is conditional and has correct parameters", () => {
        template.hasResource("AWS::CloudFormation::Stack", {
          Condition: "DeployAlarms",
          Properties: {
            TemplateURL: "infra/monitoring/alarms.cloudFormation.yaml",
            Parameters: {
              Environment: { Ref: "Environment" },
              StackName: { Ref: "AWS::StackName" }
            }
          }
        });
      });
    });

    describe("Security Stack", () => {
      test("KMS stack has correct parameters", () => {
        template.hasResourceProperties("AWS::CloudFormation::Stack", {
          TemplateURL: "infra/security/kms.cloudFormation.yaml",
          Parameters: {
            Environment: { Ref: "Environment" },
            StackName: { Ref: "AWS::StackName" },
            PendingDeletionInDays: {
              "Fn::FindInMap": ["KMS", { Ref: "Environment" }, "PendingDeletionInDays"]
            },
            TxmaAccount: {
              "Fn::FindInMap": ["TxMA", { Ref: "Environment" }, "TxmaAccount"]
            }
          }
        });
      });
    });
  });

  describe("Global Configurations", () => {
    test("Lambda global environment variables are set", () => {
      const expectedGlobals = [
        "SIGNING_KEY_ID",
        "ISSUER",
        "TXMA_SQS",
        "SESSION_TABLE_NAME",
        "POWERTOOLS_SERVICE_NAME",
        "AWS_LAMBDA_EXEC_WRAPPER",
        "DT_CONNECTION_AUTH_TOKEN",
        "DT_CONNECTION_BASE_URL",
        "DT_CLUSTER_ID",
        "DT_LOG_COLLECTION_AUTH_TOKEN",
        "DT_TENANT",
        "DT_OPEN_TELEMETRY_ENABLE_INTEGRATION"
      ];
      const envVars = template.toJSON().Globals.Function.Environment.Variables;
      Object.keys(envVars).every((envVar) => {
        expectedGlobals.includes(envVar);
      });
      expect(expectedGlobals.length).toBe(Object.keys(envVars).length);
    });

    test("Lambda global memory size is set to 512MB", () => {
      const globalMemorySize = template.toJSON().Globals.Function.MemorySize;
      expect(globalMemorySize).toStrictEqual(512);
    });

    test("Lambda global reserved concurrency and log level mapping is correct", () => {
      const lambdaMapping = template.findMappings("Lambda");
      expect(lambdaMapping).toStrictEqual({
        Lambda: {
          dev: {
            ReservedConcurrentExecutions: 15,
            LogLevel: "DEBUG"
          },
          build: {
            ReservedConcurrentExecutions: 15,
            LogLevel: "INFO"  
          },
          staging: {
            ReservedConcurrentExecutions: 0,
            LogLevel: "INFO"
          },
          integration: {
            ReservedConcurrentExecutions: 0,
            LogLevel: "INFO"
          },
          production: {
            ReservedConcurrentExecutions: 0,
            LogLevel: "INFO"
          }
        }
      });
  });
});

describe("Mappings", () => {
  test("TxMA accounts are mapped correctly", () => {
    const expectedTxmaMapping = {
      TxMA: {
        dev: {
          TxmaAccount: "arn:aws:iam::248098332657:root"
        },
        build: {
          TxmaAccount: "arn:aws:iam::750703655225:root"
        },
        staging: {
          TxmaAccount: "arn:aws:iam::178023842775:root"
        },
        integration: {
          TxmaAccount: "arn:aws:iam::729485541398:root"
        },
        production: {
          TxmaAccount: "arn:aws:iam::451773080033:root"
        }
      }
    };

    expect(template.findMappings("TxMA")).toStrictEqual(expectedTxmaMapping);
  });

  test("API rate limits are mapped correctly", () => {
    const expectedLimits = {
      dev: 10,
      build: 10,
      staging: 0,
      integration: 0,
      production: 0
    };

    const mappingHelper = new Mappings(template);

    mappingHelper.validatePrivateAPIMapping({
      environmentFlags: expectedLimits,
      mappingBottomLevelKey: "ApiRateLimit",
    });
    mappingHelper.validateSessionsApiMapping({
      environmentFlags: expectedLimits,
      mappingBottomLevelKey: "ApiRateLimit",
    });
    mappingHelper.validateProxyAPIMapping({
      environmentFlags: expectedLimits,
      mappingBottomLevelKey: "ApiRateLimit",
    });
  });
  
  test("KMS deletion window is mapped correctly", () => {
    const expectedKmsDeletionMapping = {
      dev: 7,
      build: 30,
      staging: 30,
      integration: 30,
      production: 30,
    };
    const mappingHelper = new Mappings(template);
    mappingHelper.validateKMSMapping({
      environmentFlags: expectedKmsDeletionMapping,
      mappingBottomLevelKey: "PendingDeletionInDays",
    });
  });

  test("DNS base domains are mapped correctly", () => {
    const expectedDnsMapping = {
      DNS: {
        dev: { BaseDns: "review-b-async.dev.account.gov.uk" },
        build: { BaseDns: "review-b-async.build.account.gov.uk" },
        staging: { BaseDns: "review-b-async.staging.account.gov.uk" },
        integration: { BaseDns: "review-b-async.integration.account.gov.uk" },
        production: { BaseDns: "review-b-async.account.gov.uk" }
      }
    };

    expect(template.findMappings("DNS")).toStrictEqual(expectedDnsMapping);
  });
});

describe("Outputs", () => {
  test("API URLs are output correctly", () => {
    template.hasOutput("SessionsApiUrl", {
      Description: "Sessions API Gateway base URL",
      Value: { "Fn::GetAtt": ["SessionsApiStack", "Outputs.ApiUrl"] }
    });

    template.hasOutput("PrivateApiUrl", {
      Description: "Private API Gateway base URL", 
      Value: { "Fn::GetAtt": ["PrivateApiStack", "Outputs.ApiUrl"] }
    });

    // Proxy API URL output is conditional
    template.hasOutput("ProxyApiUrl", {
      Description: "Proxy API Gateway Pretty DNS",
      Value: { "Fn::GetAtt": ["ProxyApiStack", "Outputs.ApiUrl"] },
      Condition: "ProxyApiDeployment"
    });
  });

  test("TxMA related outputs are exported correctly for dev/build", () => {
    // Check TxMA SQS Queue ARN output
    template.hasOutput("TxmaSqsQueueArn", {
      Description: "TxMA SQS Queue ARN",
      Value: { "Fn::GetAtt": ["SqsStack", "Outputs.QueueArn"] },
      Export: {
        Name: { "Fn::Sub": "${AWS::StackName}-txma-sqs-queue-arn" }
      },
      Condition: "IsDevOrBuild"
    });

    // Check TxMA KMS Key ARN output
    template.hasOutput("TxmaKmsEncryptionKeyArn", {
      Description: "TxMA KMS Encryption Key ARN",
      Value: { "Fn::GetAtt": ["SecurityStack", "Outputs.TxMAKmsKeyArn"] },
      Export: {
        Name: { "Fn::Sub": "${AWS::StackName}-txma-kms-encryption-key-arn" }
      },
      Condition: "IsDevOrBuild"
    });
  });
});
});