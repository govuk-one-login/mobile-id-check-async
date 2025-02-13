import { Capture, Match, Template } from "aws-cdk-lib/assertions";
import { readFileSync } from "fs";
import { load } from "js-yaml";
import { Mappings } from "./helpers/mappings";

const { schema } = require("yaml-cfn");

// https://docs.aws.amazon.com/cdk/v2/guide/testing.html <--- how to use this file

describe("Backend application infrastructure", () => {
  let template: Template;
  beforeEach(() => {
    let yamltemplate: any = load(readFileSync("template.yaml", "utf-8"), {
      schema: schema,
    });
    template = Template.fromJSON(yamltemplate);
  });

  describe("EnvironmentVariable mapping values", () => {
    test("STS base url is set", () => {
      const expectedEnvironmentVariablesValues = {
        dev: "https://sts-mock.review-b-async.dev.account.gov.uk",
        build: "https://sts-mock.review-b-async.build.account.gov.uk",
        staging: "https://token.staging.account.gov.uk",
        integration: "https://token.integration.account.gov.uk",
        production: "https://token.account.gov.uk",
      };

      const mappingHelper = new Mappings(template);
      mappingHelper.validateEnvironmentVariablesMapping({
        environmentFlags: expectedEnvironmentVariablesValues,
        mappingBottomLevelKey: "STSBASEURL",
      });
    });

    test("ReadIdBaseUrl assigned ID Check mock values in dev and build and vendor values in staging, integration and production", () => {
      const expectedEnvironmentVariablesValues = {
        dev: "https://readid-mock.review-b-async.dev.account.gov.uk/v2",
        build: "https://readid-mock.review-b-async.build.account.gov.uk/v2",
        staging: "", // To be updated with new ReadID URL once available
        integration: "", // To be updated with new ReadID URL once available
        production: "", // To be updated with new ReadID URL once available
      };

      const mappingHelper = new Mappings(template);
      mappingHelper.validateEnvironmentVariablesMapping({
        environmentFlags: expectedEnvironmentVariablesValues,
        mappingBottomLevelKey: "ReadIdBaseUrl",
      });
    });
  });

  describe("Private APIgw", () => {
    test("The endpoints are Private", () => {
      template.hasResourceProperties("AWS::Serverless::Api", {
        Name: { "Fn::Sub": "${AWS::StackName}-private-api" },
        EndpointConfiguration: {
          "Type": "PRIVATE",
          "VPCEndpointIds": { "Fn::FindInMap": ["PrivateApigw", { "Ref": "Environment" }, "VPCEndpointIds"] }
        },
      });
    });

    test("It uses the private async OpenAPI Spec", () => {
      template.hasResourceProperties("AWS::Serverless::Api", {
        Name: { "Fn::Sub": "${AWS::StackName}-private-api" },
        DefinitionBody: {
          "Fn::Transform": {
            Name: "AWS::Include",
            Parameters: { Location: "./openApiSpecs/async-private-spec.yaml" },
          },
        },
      });
    });

    describe("APIgw method settings", () => {
      test("Metrics are enabled", () => {
        const methodSettings = new Capture();
        template.hasResourceProperties("AWS::Serverless::Api", {
          Name: { "Fn::Sub": "${AWS::StackName}-private-api" },
          MethodSettings: methodSettings,
        });
        expect(methodSettings.asArray()[0].MetricsEnabled).toBe(true);
      });

      test("Rate and burst limit mappings are set", () => {
        const expectedBurstLimits = {
          dev: 10,
          build: 10,
          staging: 10,
          integration: 0,
          production: 0,
        };
        const expectedRateLimits = {
          dev: 10,
          build: 10,
          staging: 10,
          integration: 0,
          production: 0,
        };
        const mappingHelper = new Mappings(template);
        mappingHelper.validatePrivateAPIMapping({
          environmentFlags: expectedBurstLimits,
          mappingBottomLevelKey: "ApiBurstLimit",
        });
        mappingHelper.validatePrivateAPIMapping({
          environmentFlags: expectedRateLimits,
          mappingBottomLevelKey: "ApiRateLimit",
        });
      });

      test("Rate limit and burst mappings are applied to the APIgw", () => {
        const methodSettings = new Capture();
        template.hasResourceProperties("AWS::Serverless::Api", {
          Name: { "Fn::Sub": "${AWS::StackName}-private-api" },
          MethodSettings: methodSettings,
        });
        expect(methodSettings.asArray()[0].ThrottlingBurstLimit).toStrictEqual({
          "Fn::FindInMap": [
            "PrivateApigw",
            { Ref: "Environment" },
            "ApiBurstLimit",
          ],
        });
        expect(methodSettings.asArray()[0].ThrottlingRateLimit).toStrictEqual({
          "Fn::FindInMap": [
            "PrivateApigw",
            { Ref: "Environment" },
            "ApiRateLimit",
          ],
        });
      });
    });

    test("Access log group is attached to APIgw", () => {
      template.hasResourceProperties("AWS::Serverless::Api", {
        Name: { "Fn::Sub": "${AWS::StackName}-private-api" },
        AccessLogSetting: {
          DestinationArn: {
            "Fn::Sub":
              "arn:${AWS::Partition}:logs:${AWS::Region}:${AWS::AccountId}:log-group:${AsyncCredentialPrivateApiAccessLogs}",
          },
        },
      });
    });

    test("Access log group has a retention period", () => {
      template.hasResourceProperties("AWS::Logs::LogGroup", {
        RetentionInDays: 30,
        LogGroupName: {
          "Fn::Sub":
            "/aws/apigateway/${AWS::StackName}-private-api-access-logs",
        },
      });
    });
  });

  describe("CloudWatch alarms", () => {
    test("All critical alerts should have runbooks defined", () => {
      // to be updated only when a runbook exists for an alarm
      const runbooksByAlarm: Record<string, boolean> = {
        "high-threshold-well-known-5xx-api-gw": false,
        "high-threshold-well-known-4xx-api-gw": false,
        "high-threshold-async-token-5xx-api-gw": false,
        "high-threshold-async-token-4xx-api-gw": false,
        "high-threshold-async-credential-5xx-api-gw": false,
        "high-threshold-async-credential-4xx-api-gw": false,
        "high-threshold-async-active-session-5xx-api-gw": false,
        "high-threshold-async-active-session-4xx-api-gw": false,
        "high-threshold-async-biometric-token-5xx-api-gw": false,
        "high-threshold-async-biometric-token-4xx-api-gw": false,
      };

      const alarms = template.findResources("AWS::CloudWatch::Alarm");
      const activeCriticalAlerts = Object.entries(alarms)
        .filter(([, resource]) => {
          const alarmIsEnabled = resource.Properties.ActionsEnabled;
          const isCriticalAlert =
            resource.Properties.AlarmActions[0]["Fn::Sub"] ===
            "arn:aws:sns:${AWS::Region}:${AWS::AccountId}:platform-alarms-sns-critical";
          return alarmIsEnabled && isCriticalAlert;
        })
        .map(([, resource]) =>
          resource.Properties.AlarmName["Fn::Sub"].replace(
            "${AWS::StackName}-",
            "",
          ),
        );
      const activeCriticalAlertsWithNoRunbook = activeCriticalAlerts.filter(
        (alarmName) => runbooksByAlarm[alarmName] === false,
      );
      expect(activeCriticalAlertsWithNoRunbook).toHaveLength(0);
    });

    test("All alarms are configured with the DeployAlarm Condition", () => {
      const alarms = Object.values(
        template.findResources("AWS::CloudWatch::Alarm"),
      );
      alarms.forEach((alarm) => {
        expect(alarm).toEqual(
          expect.objectContaining({ Condition: "DeployAlarms" }),
        );
      });
    });

    describe("Warning alarms", () => {
      it.each([
        ["high-threshold-well-known-5xx-api-gw"],
        ["low-threshold-well-known-5xx-api-gw"],
        ["high-threshold-async-token-5xx-api-gw"],
        ["low-threshold-async-token-5xx-api-gw"],
        ["high-threshold-async-token-4xx-api-gw"],
        ["low-threshold-async-token-4xx-api-gw"],
        ["high-threshold-async-credential-5xx-api-gw"],
        ["low-threshold-async-credential-5xx-api-gw"],
        ["high-threshold-async-credential-4xx-api-gw"],
        ["low-threshold-async-credential-4xx-api-gw"],
        ["high-threshold-async-active-session-5xx-api-gw"],
        ["low-threshold-async-active-session-5xx-api-gw"],
        ["high-threshold-async-active-session-4xx-api-gw"],
        ["low-threshold-async-active-session-4xx-api-gw"],
        ["high-threshold-async-biometric-token-4xx-api-gw"],
        ["low-threshold-async-biometric-token-4xx-api-gw"],
        ["high-threshold-async-biometric-token-5xx-api-gw"],
        ["low-threshold-async-biometric-token-5xx-api-gw"],
      ])(
        "The %s alarm is configured to send an event to the warnings SNS topic on Alarm and OK actions",
        (alarmName: string) => {
          template.hasResourceProperties("AWS::CloudWatch::Alarm", {
            AlarmName: { "Fn::Sub": `\${AWS::StackName}-${alarmName}` },
            AlarmActions: [
              {
                "Fn::Sub":
                  "arn:aws:sns:${AWS::Region}:${AWS::AccountId}:platform-alarms-sns-warning",
              },
            ],
            OKActions: [
              {
                "Fn::Sub":
                  "arn:aws:sns:${AWS::Region}:${AWS::AccountId}:platform-alarms-sns-warning",
              },
            ],
            ActionsEnabled: true,
          });
        },
      );
    });
  });

  describe("Sessions APIgw", () => {
    test("The endpoints are REGIONAL", () => {
      template.hasResourceProperties("AWS::Serverless::Api", {
        Name: { "Fn::Sub": "${AWS::StackName}-sessions-api" },
        EndpointConfiguration: "REGIONAL",
      });
    });

    test("It uses the public async OpenAPI Spec", () => {
      template.hasResourceProperties("AWS::Serverless::Api", {
        Name: { "Fn::Sub": "${AWS::StackName}-sessions-api" },
        DefinitionBody: {
          "Fn::Transform": {
            Name: "AWS::Include",
            Parameters: { Location: "./openApiSpecs/async-public-spec.yaml" },
          },
        },
      });
    });

    test("It disables the FMS WAF", () => {
      template.hasResourceProperties("AWS::Serverless::Api", {
        Name: { "Fn::Sub": "${AWS::StackName}-sessions-api" },
        Tags: { FMSRegionalPolicy: false },
      });
    });

    describe("APIgw method settings", () => {
      test("Metrics are enabled", () => {
        const methodSettings = new Capture();
        template.hasResourceProperties(
          "AWS::Serverless::Api",

          {
            Name: { "Fn::Sub": "${AWS::StackName}-sessions-api" },
            MethodSettings: methodSettings,
          },
        );
        expect(methodSettings.asArray()[0].MetricsEnabled).toBe(true);
      });

      test("Rate and burst limit mappings are set", () => {
        const expectedBurstLimits = {
          dev: 10,
          build: 10,
          staging: 10,
          integration: 0,
          production: 0,
        };

        const expectedRateLimits = {
          dev: 10,
          build: 10,
          staging: 10,
          integration: 0,
          production: 0,
        };
        const mappingHelper = new Mappings(template);
        mappingHelper.validateSessionsApiMapping({
          environmentFlags: expectedBurstLimits,
          mappingBottomLevelKey: "ApiBurstLimit",
        });
        mappingHelper.validateSessionsApiMapping({
          environmentFlags: expectedRateLimits,
          mappingBottomLevelKey: "ApiRateLimit",
        });
      });

      test("Rate limit and burst mappings are applied to the APIgw", () => {
        const methodSettings = new Capture();
        template.hasResourceProperties(
          "AWS::Serverless::Api",

          {
            Name: { "Fn::Sub": "${AWS::StackName}-sessions-api" },
            MethodSettings: methodSettings,
          },
        );
        expect(methodSettings.asArray()[0].ThrottlingBurstLimit).toStrictEqual({
          "Fn::FindInMap": [
            "SessionsApigw",
            { Ref: "Environment" },
            "ApiBurstLimit",
          ],
        });

        expect(methodSettings.asArray()[0].ThrottlingRateLimit).toStrictEqual({
          "Fn::FindInMap": [
            "SessionsApigw",
            { Ref: "Environment" },
            "ApiRateLimit",
          ],
        });
      });
    });

    test("Access log group is attached to APIgw", () => {
      template.hasResourceProperties("AWS::Serverless::Api", {
        Name: { "Fn::Sub": "${AWS::StackName}-sessions-api" },
        AccessLogSetting: {
          DestinationArn: {
            "Fn::Sub":
              "arn:${AWS::Partition}:logs:${AWS::Region}:${AWS::AccountId}:log-group:${SessionsApiAccessLogs}",
          },
        },
      });
    });

    test("Access log group has a retention period", () => {
      template.hasResourceProperties("AWS::Logs::LogGroup", {
        RetentionInDays: 30,
        LogGroupName: {
          "Fn::Sub":
            "/aws/apigateway/${AWS::StackName}-sessions-api-access-logs",
        },
      });
    });
  });

  describe("Proxy APIgw", () => {
    test("The endpoints are Regional", () => {
      template.hasResourceProperties("AWS::Serverless::Api", {
        Name: { "Fn::Sub": "${AWS::StackName}-proxy-api" },
        EndpointConfiguration: "REGIONAL",
      });
    });

    test("It uses the proxy async OpenAPI Spec", () => {
      template.hasResourceProperties("AWS::Serverless::Api", {
        Name: { "Fn::Sub": "${AWS::StackName}-proxy-api" },
        DefinitionBody: {
          "Fn::Transform": {
            Name: "AWS::Include",
            Parameters: {
              Location: "./openApiSpecs/async-proxy-private-spec.yaml",
            },
          },
        },
      });
    });

    describe("APIgw method settings", () => {
      test("Metrics are enabled", () => {
        const methodSettings = new Capture();
        template.hasResourceProperties("AWS::Serverless::Api", {
          Name: { "Fn::Sub": "${AWS::StackName}-proxy-api" },
          MethodSettings: methodSettings,
        });
        expect(methodSettings.asArray()[0].MetricsEnabled).toBe(true);
      });

      test("Rate and burst limit mappings are set", () => {
        const expectedBurstLimits = {
          dev: 10,
          build: 10,
          staging: 10,
          integration: 0,
          production: 0,
        };
        const expectedRateLimits = {
          dev: 10,
          build: 10,
          staging: 10,
          integration: 0,
          production: 0,
        };
        const mappingHelper = new Mappings(template);
        mappingHelper.validateProxyAPIMapping({
          environmentFlags: expectedBurstLimits,
          mappingBottomLevelKey: "ApiBurstLimit",
        });
        mappingHelper.validateProxyAPIMapping({
          environmentFlags: expectedRateLimits,
          mappingBottomLevelKey: "ApiRateLimit",
        });
      });

      test("Rate limit and burst mappings are applied to the APIgw", () => {
        const methodSettings = new Capture();
        template.hasResourceProperties("AWS::Serverless::Api", {
          Name: { "Fn::Sub": "${AWS::StackName}-proxy-api" },
          MethodSettings: methodSettings,
        });
        expect(methodSettings.asArray()[0].ThrottlingBurstLimit).toStrictEqual({
          "Fn::FindInMap": [
            "ProxyApigw",
            { Ref: "Environment" },
            "ApiBurstLimit",
          ],
        });
        expect(methodSettings.asArray()[0].ThrottlingRateLimit).toStrictEqual({
          "Fn::FindInMap": [
            "ProxyApigw",
            { Ref: "Environment" },
            "ApiRateLimit",
          ],
        });
      });
    });

    test("Access log group is attached to APIgw", () => {
      template.hasResourceProperties("AWS::Serverless::Api", {
        Name: { "Fn::Sub": "${AWS::StackName}-proxy-api" },
        AccessLogSetting: {
          DestinationArn: {
            "Fn::GetAtt": ["ProxyApiAccessLogs", "Arn"],
          },
        },
      });
    });

    test("Access log group has a retention period", () => {
      template.hasResourceProperties("AWS::Logs::LogGroup", {
        RetentionInDays: 30,
        LogGroupName: {
          "Fn::Sub": "/aws/apigateway/${AWS::StackName}-proxy-api-access-logs",
        },
      });
    });
  });

  describe("Lambdas", () => {
    describe("Globals", () => {
      test("Global environment variables are set", () => {
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
          "DT_OPEN_TELEMETRY_ENABLE_INTEGRATION",
        ];
        const envVars =
          template.toJSON().Globals.Function.Environment.Variables;
        Object.keys(envVars).every((envVar) => {
          expectedGlobals.includes(envVar);
        });
        expect(expectedGlobals.length).toBe(Object.keys(envVars).length);
      });

      test("Global reserved concurrency is set", () => {
        const reservedConcurrentExecutionMapping =
          template.findMappings("Lambda");

        expect(reservedConcurrentExecutionMapping).toStrictEqual({
          Lambda: {
            dev: expect.objectContaining({
              ReservedConcurrentExecutions: 0, // Placeholder value to satisfy Cloudformation validation requirements when the environment is dev
            }),
            build: expect.objectContaining({
              ReservedConcurrentExecutions: 15,
            }),
            staging: expect.objectContaining({
              ReservedConcurrentExecutions: 15,
            }),
            integration: expect.objectContaining({
              ReservedConcurrentExecutions: 0,
            }),
            production: expect.objectContaining({
              ReservedConcurrentExecutions: 0,
            }),
          },
        });

        const reservedConcurrentExecutions =
          template.toJSON().Globals.Function.ReservedConcurrentExecutions;

        expect(reservedConcurrentExecutions).toStrictEqual({
          "Fn::If": [
            "isDev",
            {
              Ref: "AWS::NoValue",
            },
            {
              "Fn::FindInMap": [
                "Lambda",
                {
                  Ref: "Environment",
                },
                "ReservedConcurrentExecutions",
              ],
            },
          ],
        });
      });

      test("Global memory size is set to 512MB", () => {
        const globalMemorySize = template.toJSON().Globals.Function.MemorySize;
        expect(globalMemorySize).toStrictEqual(512);
      });

      test("Global autoPublishAlias is set to live", () => {
        const autoPublishAlias =
          template.toJSON().Globals.Function.AutoPublishAlias;
        expect(autoPublishAlias).toStrictEqual("live");
      });

      test("Global AutoPublishAliasAllProperties is set to true", () => {
        const autoPublishAliasAllProperties =
          template.toJSON().Globals.Function.AutoPublishAliasAllProperties;
        expect(autoPublishAliasAllProperties).toStrictEqual(true);
      });
    });

    test("All lambdas have a FunctionName defined", () => {
      const lambdas = template.findResources("AWS::Serverless::Function");
      const lambda_list = Object.keys(lambdas);
      lambda_list.forEach((lambda) => {
        expect(lambdas[lambda].Properties.FunctionName).toBeTruthy();
      });
    });

    test("All lambdas have a log group", () => {
      const lambdas = template.findResources("AWS::Serverless::Function");
      const lambda_list = Object.keys(lambdas);
      lambda_list.forEach((lambda) => {
        const functionName = lambdas[lambda].Properties.FunctionName["Fn::Sub"];
        const expectedLogName = {
          "Fn::Sub": `/aws/lambda/${functionName}`,
        };
        template.hasResourceProperties("AWS::Logs::LogGroup", {
          LogGroupName: Match.objectLike(expectedLogName),
        });
      });
    });

    test("All log groups have a retention period", () => {
      const logGroups = template.findResources("AWS::Logs::LogGroup");
      const logGroupList = Object.keys(logGroups);
      logGroupList.forEach((logGroup) => {
        expect(logGroups[logGroup].Properties.RetentionInDays).toEqual(30);
      });
    });

    test("Token and Credential lambdas have the client registry environment variable", () => {
      const createSessionLambdaHandlers = [
        "asyncTokenHandler.lambdaHandler",
        "asyncCredentialHandler.lambdaHandler",
      ];
      createSessionLambdaHandlers.forEach((lambdaHandler) => {
        template.hasResourceProperties("AWS::Serverless::Function", {
          Handler: lambdaHandler,
          Environment: {
            Variables: {
              CLIENT_REGISTRY_SECRET_NAME: {
                "Fn::FindInMap": [
                  "EnvironmentVariables",
                  { Ref: "Environment" },
                  "ClientRegistrySecretPath",
                ],
              },
            },
          },
        });
      });
    });

    test("All lambdas are attached to a VPC ", () => {
      const lambdas = template.findResources("AWS::Serverless::Function");
      const lambda_list = Object.keys(lambdas);
      lambda_list.forEach((lambda) => {
        expect(lambdas[lambda].Properties.VpcConfig).toBeTruthy();
      });
    });

    test("Token, Credential, JWKS and FinishBiometricSession lambdas are attached to a VPC and subnets are private", () => {
      const lambdaHandlers = [
        "asyncTokenHandler.lambdaHandler",
        "asyncCredentialHandler.lambdaHandler",
        "jwksHandler.lambdaHandler",
        "asyncFinishBiometricSessionHandler.lambdaHandler",
      ];
      lambdaHandlers.forEach((lambdaHandler) => {
        template.hasResourceProperties("AWS::Serverless::Function", {
          Handler: lambdaHandler,
          VpcConfig: {
            SubnetIds: [
              { "Fn::ImportValue": "devplatform-vpc-PrivateSubnetIdA" },
              { "Fn::ImportValue": "devplatform-vpc-PrivateSubnetIdB" },
              { "Fn::ImportValue": "devplatform-vpc-PrivateSubnetIdC" },
            ],
            SecurityGroupIds: [
              {
                "Fn::ImportValue":
                  "devplatform-vpc-AWSServicesEndpointSecurityGroupId",
              },
            ],
          },
        });
      });
    });

    test("ActiveSession and BiometricToken lambdas are attached to a VPC and subnets are protected", () => {
      const lambdaHandlers = [
        "asyncActiveSessionHandler.lambdaHandler",
        "asyncBiometricTokenHandler.lambdaHandler",
      ];
      lambdaHandlers.forEach((lambdaHandler) => {
        template.hasResourceProperties("AWS::Serverless::Function", {
          Handler: lambdaHandler,
          VpcConfig: {
            SubnetIds: [
              { "Fn::ImportValue": "devplatform-vpc-ProtectedSubnetIdA" },
              { "Fn::ImportValue": "devplatform-vpc-ProtectedSubnetIdB" },
              { "Fn::ImportValue": "devplatform-vpc-ProtectedSubnetIdC" },
            ],
            SecurityGroupIds: [
              {
                "Fn::ImportValue":
                  "devplatform-vpc-AWSServicesEndpointSecurityGroupId",
              },
            ],
          },
        });
      });
    });
  });

  describe("KMS", () => {
    test("All keys have a retention window once deleted", () => {
      const kmsKeys = template.findResources("AWS::KMS::Key");
      const kmsKeyList = Object.keys(kmsKeys);
      kmsKeyList.forEach((kmsKey) => {
        expect(kmsKeys[kmsKey].Properties.PendingWindowInDays).toStrictEqual({
          "Fn::FindInMap": [
            "KMS",
            { Ref: "Environment" },
            "PendingDeletionInDays",
          ],
        });
      });
    });

    test("Mappings are defined for retention window", () => {
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
  });

  describe("IAM", () => {
    // See: https://github.com/govuk-one-login/devplatform-deploy/blob/c298f297141f414798899a622509262fbb309260/sam-deploy-pipeline/template.yaml#L3759
    test("Every IAM role has a permissions boundary", () => {
      const iamRoles = template.findResources("AWS::IAM::Role");
      const iamRolesList = Object.keys(iamRoles);
      iamRolesList.forEach((iamRole) => {
        expect(iamRoles[iamRole].Properties.PermissionsBoundary).toStrictEqual({
          "Fn::If": [
            "UsePermissionsBoundary",
            { Ref: "PermissionsBoundary" },
            { Ref: "AWS::NoValue" },
          ],
        });
      });
    });

    // See: https://github.com/govuk-one-login/devplatform-deploy/blob/c298f297141f414798899a622509262fbb309260/sam-deploy-pipeline/template.yaml#L3759
    test("Every IAM role name conforms to dev platform naming standard", () => {
      const iamRoles = template.findResources("AWS::IAM::Role");
      const iamRolesList = Object.keys(iamRoles);
      iamRolesList.forEach((iamRole) => {
        const roleName = iamRoles[iamRole].Properties.RoleName[
          "Fn::Sub"
        ] as string;
        const roleNameConformsToStandards =
          roleName.startsWith("${AWS::StackName}-");
        expect(roleNameConformsToStandards).toBe(true);
      });
    });
  });

  describe("S3", () => {
    test("All buckets have a name", () => {
      const buckets = template.findResources("AWS::S3::Bucket");
      const bucketList = Object.keys(buckets);
      bucketList.forEach((bucket) => {
        expect(buckets[bucket].Properties.BucketName).toBeTruthy();
      });
    });

    test("All buckets have an associated bucket policy", () => {
      const buckets = template.findResources("AWS::S3::Bucket");
      const bucketList = Object.keys(buckets);
      bucketList.forEach((bucket) => {
        template.hasResourceProperties(
          "AWS::S3::BucketPolicy",
          Match.objectLike({
            Bucket: { Ref: bucket },
          }),
        );
      });
    });

    test("All buckets have public access blocked", () => {
      const buckets = template.findResources("AWS::S3::Bucket");
      const bucketList = Object.keys(buckets);
      bucketList.forEach((bucket) => {
        expect(
          buckets[bucket].Properties.PublicAccessBlockConfiguration,
        ).toEqual(
          expect.objectContaining({
            BlockPublicAcls: true,
            BlockPublicPolicy: true,
            IgnorePublicAcls: true,
            RestrictPublicBuckets: true,
          }),
        );
      });
    });

    test("All buckets have encryption enabled", () => {
      const buckets = template.findResources("AWS::S3::Bucket");
      const bucketList = Object.keys(buckets);
      bucketList.forEach((bucket) => {
        expect(
          buckets[bucket].Properties.BucketEncryption
            .ServerSideEncryptionConfiguration,
        ).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              ServerSideEncryptionByDefault: expect.objectContaining({
                SSEAlgorithm: expect.any(String),
              }),
            }),
          ]),
        );
      });
    });
  });
});
