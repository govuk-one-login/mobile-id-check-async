import { Capture, Match, Template } from "aws-cdk-lib/assertions";
import { readFileSync } from "fs";
import { load } from "js-yaml";

const { schema } = require("yaml-cfn");

// https://docs.aws.amazon.com/cdk/v2/guide/testing.html <--- how to use this file

const yamltemplate: any = load(readFileSync("template.yaml", "utf-8"), {
  schema: schema,
});

const template = Template.fromJSON(yamltemplate, {
  skipCyclicalDependenciesCheck: true, // Note: canary alarms falsely trigger the circular dependency check. sam validate --lint (cfn-lint) can correctly handle this so we do not miss out here.
});

describe("Backend application infrastructure", () => {
  test("All mappings have expected values for all environments", () => {
    const expectedMappings = load(
      readFileSync("tests/infra-tests/expectedMappings.yaml", "utf-8"),
      {
        schema: schema,
      },
    );
    expect(yamltemplate.Mappings).toEqual(expectedMappings);
  });

  describe("Private APIgw", () => {
    test("The endpoints are Private", () => {
      template.hasResourceProperties("AWS::Serverless::Api", {
        Name: { "Fn::Sub": "${AWS::StackName}-private-api" },
        EndpointConfiguration: {
          Type: "PRIVATE",
          VPCEndpointIds: [
            {
              "Fn::If": [
                "IntegrateIpvCore",

                {
                  "Fn::FindInMap": [
                    "EnvironmentVariables",
                    "IpvCoreVpceId",
                    { Ref: "Environment" },
                  ],
                },

                { Ref: "AWS::NoValue" },
              ],
            },
            {
              "Fn::If": [
                "IntegratePerformanceTesting",
                {
                  "Fn::FindInMap": [
                    "EnvironmentVariables",
                    "PerformanceTestingVpceId",
                    { Ref: "Environment" },
                  ],
                },
                { Ref: "AWS::NoValue" },
              ],
            },
          ],
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

      test("Rate limit and burst mappings are applied to the APIgw", () => {
        const methodSettings = new Capture();
        template.hasResourceProperties("AWS::Serverless::Api", {
          Name: { "Fn::Sub": "${AWS::StackName}-private-api" },
          MethodSettings: methodSettings,
        });
        expect(methodSettings.asArray()[0].ThrottlingBurstLimit).toStrictEqual({
          "Fn::FindInMap": [
            "EnvironmentVariables",
            "PrivateApiBurstLimit",
            { Ref: "Environment" },
          ],
        });
        expect(methodSettings.asArray()[0].ThrottlingRateLimit).toStrictEqual({
          "Fn::FindInMap": [
            "EnvironmentVariables",
            "PrivateApiRateLimit",
            { Ref: "Environment" },
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
              "arn:${AWS::Partition}:logs:${AWS::Region}:${AWS::AccountId}:log-group:${AsyncPrivateApiAccessLogs}",
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
    test("All alarms are configured with a Condition", () => {
      const conditionalNames = [
        "DeployAlarms",
        "UseCanaryDeployment",
        "DeployProxyAlarms",
      ];
      const alarms = Object.values(
        template.findResources("AWS::CloudWatch::Alarm"),
      );

      alarms.forEach((alarm) => {
        expect(conditionalNames).toContain(alarm.Condition);
      });
    });

    describe("Warning alarms", () => {
      it.each([
        ["low-threshold-well-known-5xx-api-gw"],
        ["low-threshold-async-token-5xx-api-gw"],
        ["low-threshold-async-token-4xx-api-gw"],
        ["low-threshold-async-credential-5xx-api-gw"],
        ["low-threshold-async-credential-4xx-api-gw"],
        ["low-threshold-async-active-session-5xx-api-gw"],
        ["low-threshold-async-biometric-token-4xx-api-gw"],
        ["low-threshold-async-biometric-token-5xx-api-gw"],
        ["low-threshold-async-finish-biometric-session-4xx-api-gw"],
        ["low-threshold-async-finish-biometric-session-5xx-api-gw"],
        ["low-threshold-async-abort-session-4xx-api-gw"],
        ["high-threshold-async-abort-session-4xx-api-gw"],
        ["low-threshold-async-abort-session-5xx-api-gw"],
        ["high-threshold-async-txma-event-4xx-api-gw"],
        ["low-threshold-async-txma-event-4xx-api-gw"],
        ["high-threshold-async-txma-event-5xx-api-gw"],
        ["low-threshold-async-txma-event-5xx-api-gw"],
        ["finish-biometric-session-lambda-error-rate"],
        ["finish-biometric-session-lambda-low-completion"],
        ["biometric-token-lambda-error-rate"],
        ["biometric-token-lambda-low-completion"],
        ["token-lambda-error-rate"],
        ["token-lambda-low-completion"],
        ["credential-lambda-error-rate"],
        ["credential-lambda-low-completion"],
        ["active-session-lambda-error-rate"],
        ["active-session-lambda-low-completion"],
        ["issue-biometric-credential-lambda-error-rate"],
        ["issue-biometric-credential-lambda-low-completion"],
        ["vendor-processing-sqs-age-of-oldest-message"],
        ["vendor-processing-dlq-message-visible"],
        ["low-threshold-vendor-processing-dlq-age-of-oldest-message"],
        ["ipv-core-sqs-age-of-oldest-message"],
        ["low-threshold-ipv-core-dlq-message-visible"],
        ["ipv-core-dlq-message-inflow-vs-started"],
        ["low-threshold-ipv-core-dlq-age-of-oldest-message"],
        ["low-threshold-async-issue-biometric-credential-parse-failure"],
        [
          "low-threshold-async-issue-biometric-credential-biometric-session-not-valid",
        ],
        ["async-issue-biometric-credential-driving-licence-expired"],
        [
          "low-threshold-async-issue-biometric-credential-error-writing-audit-event",
        ],
        [
          "low-threshold-async-issue-biometric-credential-failure-to-get-biometric-session-from-vendor",
        ],
        ["lambda-claimed-account-concurrency-reaching-limit"],
        ["proxy-lambda-throttle"],
        ["sessions-api-latency"],
        ["private-api-latency"],
        ["token-concurrency-reaching-limit"],
        ["credential-concurrency-reaching-limit"],
        ["active-session-concurrency-reaching-limit"],
        ["biometric-token-concurrency-reaching-limit"],
        ["finish-biometric-session-concurrency-reaching-limit"],
        ["issue-biometric-credential-concurrency-reaching-limit"],
        ["abort-session-concurrency-reaching-limit"],
        ["txma-event-concurrency-reaching-limit"],
        ["zero-journeys-started"],
        ["passport-biometric-sessions-not-ready"],
        ["driving-licence-biometric-sessions-not-ready"],
        ["brp-biometric-sessions-not-ready"],
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

    describe("Critical alarms", () => {
      const criticalAlarms = [
        {
          name: "high-threshold-well-known-5xx-api-gw",
          hasRunbookBeenSignedOff: true,
        },
        {
          name: "high-threshold-async-token-5xx-api-gw",
          hasRunbookBeenSignedOff: true,
        },
        {
          name: "high-threshold-async-token-4xx-api-gw",
          hasRunbookBeenSignedOff: true,
        },
        {
          name: "high-threshold-async-credential-5xx-api-gw",
          hasRunbookBeenSignedOff: true,
        },
        {
          name: "high-threshold-async-credential-4xx-api-gw",
          hasRunbookBeenSignedOff: true,
        },
        {
          name: "high-threshold-async-active-session-5xx-api-gw",
          hasRunbookBeenSignedOff: true,
        },
        {
          name: "high-threshold-async-biometric-token-5xx-api-gw",
          hasRunbookBeenSignedOff: true,
        },
        {
          name: "high-threshold-async-biometric-token-4xx-api-gw",
          hasRunbookBeenSignedOff: true,
        },
        {
          name: "high-threshold-async-finish-biometric-session-5xx-api-gw",
          hasRunbookBeenSignedOff: true,
        },
        {
          name: "high-threshold-async-finish-biometric-session-4xx-api-gw",
          hasRunbookBeenSignedOff: true,
        },
        {
          name: "high-threshold-async-abort-session-5xx-api-gw",
          hasRunbookBeenSignedOff: true,
        },
        {
          name: "issue-biometric-credential-lambda-invalid-sqs-event",
          hasRunbookBeenSignedOff: true,
        },
        {
          name: "high-threshold-async-issue-biometric-credential-parse-failure",
          hasRunbookBeenSignedOff: true,
        },
        {
          name: "high-threshold-async-issue-biometric-credential-biometric-session-not-valid",
          hasRunbookBeenSignedOff: true,
        },
        {
          name: "async-issue-biometric-credential-vendor-likeness-disabled",
          hasRunbookBeenSignedOff: true,
        },
        {
          name: "high-threshold-async-issue-biometric-credential-error-writing-audit-event",
          hasRunbookBeenSignedOff: true,
        },
        {
          name: "high-threshold-async-issue-biometric-credential-failure-to-get-biometric-session-from-vendor",
          hasRunbookBeenSignedOff: true,
        },
        {
          name: "abort-session-lambda-throttle",
          hasRunbookBeenSignedOff: true,
        },
        {
          name: "active-session-lambda-throttle",
          hasRunbookBeenSignedOff: true,
        },
        {
          name: "biometric-token-lambda-throttle",
          hasRunbookBeenSignedOff: true,
        },
        {
          name: "credential-lambda-throttle",
          hasRunbookBeenSignedOff: true,
        },
        {
          name: "finish-biometric-session-lambda-throttle",
          hasRunbookBeenSignedOff: true,
        },
        {
          name: "token-lambda-throttle",
          hasRunbookBeenSignedOff: true,
        },
        {
          name: "txma-event-lambda-throttle",
          hasRunbookBeenSignedOff: true,
        },
        {
          name: "zero-vcs-issued",
          hasRunbookBeenSignedOff: true,
        },
        {
          name: "low-journey-completion",
          hasRunbookBeenSignedOff: true,
        },
      ];

      const snsCriticalTopicArn = {
        "Fn::Sub":
          "arn:aws:sns:${AWS::Region}:${AWS::AccountId}:platform-alarms-sns-critical",
      };

      test("All documented critical alarms exist and notify critical SNS", () => {
        criticalAlarms.forEach((alarm) => {
          template.hasResourceProperties("AWS::CloudWatch::Alarm", {
            AlarmName: { "Fn::Sub": `\${AWS::StackName}-${alarm.name}` },
            AlarmActions: [snsCriticalTopicArn],
            OKActions: [snsCriticalTopicArn],
            ActionsEnabled: true,
          });
        });
      });

      test("No undocumented critical alarms exist", () => {
        const alarms = template.findResources("AWS::CloudWatch::Alarm");
        const templateAlarmNames = Object.values(alarms)
          .filter((alarm: any) => {
            const actions = alarm.Properties.AlarmActions || [];
            return actions.some(
              (action: any) =>
                action["Fn::Sub"] &&
                action["Fn::Sub"].includes("platform-alarms-sns-critical"),
            );
          })
          .map((alarm: any) =>
            alarm.Properties.AlarmName["Fn::Sub"].replace(
              "${AWS::StackName}-",
              "",
            ),
          );
        const criticalAlarmNames = criticalAlarms.map((alarm) => alarm.name);

        expect(new Set(templateAlarmNames)).toEqual(
          new Set(criticalAlarmNames),
        );
      });

      test("All critical alarms reference the support manual mapping in their description", () => {
        criticalAlarms.forEach((alarm) => {
          const alarmDescriptionCapture = new Capture();
          template.hasResourceProperties("AWS::CloudWatch::Alarm", {
            AlarmName: { "Fn::Sub": `\${AWS::StackName}-${alarm.name}` },
            AlarmDescription: alarmDescriptionCapture,
          });

          const alarmDescription = alarmDescriptionCapture.asObject();
          const [description, substitutions] = alarmDescription["Fn::Sub"];

          expect(description).toContain("SupportManualUrl");
          expect(substitutions).toEqual({
            SupportManualUrl: {
              "Fn::FindInMap": ["StaticVariables", "SupportManual", "value"],
            },
          });
        });
      });

      test("Critical alarms have signed off runbook", () => {
        criticalAlarms.forEach((alarm) => {
          expect(alarm.hasRunbookBeenSignedOff).toEqual(true);
        });
      });
    });

    test("Account claimed concurrency alarm set to 80%", () => {
      expect(
        template.hasResourceProperties("AWS::CloudWatch::Alarm", {
          AlarmName: {
            "Fn::Sub":
              "${AWS::StackName}-lambda-claimed-account-concurrency-reaching-limit",
          },
          Threshold: 800,
        }),
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
            "EnvironmentVariables",
            "SessionsApiBurstLimit",
            { Ref: "Environment" },
          ],
        });

        expect(methodSettings.asArray()[0].ThrottlingRateLimit).toStrictEqual({
          "Fn::FindInMap": [
            "EnvironmentVariables",
            "SessionsApiRateLimit",
            { Ref: "Environment" },
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

      test("Rate limit and burst mappings are applied to the APIgw", () => {
        const methodSettings = new Capture();
        template.hasResourceProperties("AWS::Serverless::Api", {
          Name: { "Fn::Sub": "${AWS::StackName}-proxy-api" },
          MethodSettings: methodSettings,
        });
        expect(methodSettings.asArray()[0].ThrottlingBurstLimit).toStrictEqual({
          "Fn::FindInMap": [
            "EnvironmentVariables",
            "ProxyApiBurstLimit",
            { Ref: "Environment" },
          ],
        });
        expect(methodSettings.asArray()[0].ThrottlingRateLimit).toStrictEqual({
          "Fn::FindInMap": [
            "EnvironmentVariables",
            "ProxyApiRateLimit",
            { Ref: "Environment" },
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
          "VENDOR_PROCESSING_SQS",
          "IPVCORE_OUTBOUND_SQS",
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
                "EnvironmentVariables",
                "DefaultReservedConcurrentExecutions",
                {
                  Ref: "Environment",
                },
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

      test("Global application and system log level is set", () => {
        const loggingConfig = template.toJSON().Globals.Function.LoggingConfig;
        expect(loggingConfig).toStrictEqual({
          ApplicationLogLevel: {
            "Fn::FindInMap": [
              "EnvironmentVariables",
              "LambdaLogLevel",
              {
                Ref: "Environment",
              },
            ],
          },
          LogFormat: "JSON",
          SystemLogLevel: "INFO",
        });
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

    test("All log groups have a CSLS subscription filter", () => {
      const log_groups = template.findResources("AWS::Logs::LogGroup");
      const logs_list = Object.keys(log_groups);
      logs_list.forEach((log_name) => {
        template.hasResourceProperties("AWS::Logs::SubscriptionFilter", {
          LogGroupName: Match.objectLike({ Ref: log_name }),
          DestinationArn: Match.objectLike({
            "Fn::FindInMap": [
              "EnvironmentVariables",
              "CslsEgress",
              { Ref: "Environment" },
            ],
          }),
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
                  "ClientRegistrySecretPath",
                  { Ref: "Environment" },
                ],
              },
            },
          },
        });
      });
    });

    test("Credential lambda has the session duration environment variable set", () => {
      template.hasResourceProperties("AWS::Serverless::Function", {
        Handler: "asyncCredentialHandler.lambdaHandler",
        Environment: {
          Variables: {
            SESSION_DURATION_IN_SECONDS: {
              "Fn::FindInMap": [
                "EnvironmentVariables",
                "SessionDurationInSeconds",
                { Ref: "Environment" },
              ],
            },
          },
        },
      });
    });

    test("All lambdas are attached to a VPC ", () => {
      const lambdas = template.findResources("AWS::Serverless::Function");
      const lambda_list = Object.keys(lambdas);
      lambda_list.forEach((lambda) => {
        expect(lambdas[lambda].Properties.VpcConfig).toBeTruthy();
      });
    });

    test("Token, Credential, JWKS, FinishBiometricSession, TxmaEvent and AbortSession lambdas are attached to a VPC and subnets are private", () => {
      const lambdaHandlers = [
        "asyncTokenHandler.lambdaHandler",
        "asyncCredentialHandler.lambdaHandler",
        "jwksHandler.lambdaHandler",
        "asyncFinishBiometricSessionHandler.lambdaHandler",
        "asyncTxmaEventHandler.lambdaHandler",
        "asyncAbortSessionHandler.lambdaHandler",
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

    test("ActiveSession, BiometricToken and IssueBiometricCredential lambdas are attached to a VPC and subnets are protected", () => {
      const lambdaHandlers = [
        "asyncActiveSessionHandler.lambdaHandler",
        "asyncBiometricTokenHandler.lambdaHandler",
        "asyncIssueBiometricCredentialHandler.lambdaHandler",
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

    test("IssueBiometricCredential lambda reserved concurrency is set", () => {
      template.hasResourceProperties("AWS::Serverless::Function", {
        Handler: "asyncIssueBiometricCredentialHandler.lambdaHandler",
        ReservedConcurrentExecutions: {
          "Fn::If": [
            "isDev",
            {
              Ref: "AWS::NoValue",
            },
            {
              "Fn::FindInMap": [
                "EnvironmentVariables",
                "IssueBiometricCredentialReservedConcurrentExecutions",
                {
                  Ref: "Environment",
                },
              ],
            },
          ],
        },
      });
    });

    test("AsyncToken lambda reserved concurrency is set", () => {
      template.hasResourceProperties("AWS::Serverless::Function", {
        Handler: "asyncTokenHandler.lambdaHandler",
        ReservedConcurrentExecutions: {
          "Fn::If": [
            "isDev",
            {
              Ref: "AWS::NoValue",
            },
            {
              "Fn::FindInMap": [
                "EnvironmentVariables",
                "AsyncTokenReservedConcurrentExecutions",
                {
                  Ref: "Environment",
                },
              ],
            },
          ],
        },
      });
    });

    test("AsyncCredential lambda reserved concurrency is set", () => {
      template.hasResourceProperties("AWS::Serverless::Function", {
        Handler: "asyncCredentialHandler.lambdaHandler",
        ReservedConcurrentExecutions: {
          "Fn::If": [
            "isDev",
            {
              Ref: "AWS::NoValue",
            },
            {
              "Fn::FindInMap": [
                "EnvironmentVariables",
                "AsyncCredentialReservedConcurrentExecutions",
                {
                  Ref: "Environment",
                },
              ],
            },
          ],
        },
      });
    });

    test("JsonWebKeys lambda reserved concurrency is set", () => {
      template.hasResourceProperties("AWS::Serverless::Function", {
        Handler: "jwksHandler.lambdaHandler",
        ReservedConcurrentExecutions: {
          "Fn::FindInMap": [
            "EnvironmentVariables",
            "JsonWebKeysReservedConcurrentExecutions",
            {
              Ref: "Environment",
            },
          ],
        },
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
            "EnvironmentVariables",
            "KmsPendingDeletionInDays",
            { Ref: "Environment" },
          ],
        });
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

    test("IAM service role is created with CodeDeployRoleForLambda policy attached", () => {
      template.hasResourceProperties("AWS::IAM::Role", {
        ManagedPolicyArns: [
          "arn:aws:iam::aws:policy/service-role/AWSCodeDeployRoleForLambda",
        ],
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

  describe("SQS", () => {
    const queues = Object.values(template.findResources("AWS::SQS::Queue"));

    test("All SQS queues have the QueueName as a property that has the stack name as a prefix", () => {
      const queueNamePrefix = new RegExp(/^\${AWS::StackName}-.*/);

      queues.forEach((queue) => {
        expect(queue.Properties.QueueName["Fn::Sub"]).toMatch(queueNamePrefix);
      });
    });

    test("All primary SQS have a DLQ", () => {
      const queuesFiltered = queues.filter(
        (queue: any) => !queue.Properties.QueueName["Fn::Sub"].endsWith("-dlq"),
      );

      queuesFiltered.forEach((queue) => {
        expect(
          queue.Properties.RedrivePolicy.deadLetterTargetArn["Fn::GetAtt"],
        ).toStrictEqual([expect.any(String), "Arn"]);
      });
    });
  });

  describe("Canary Deployments", () => {
    it("Template parameter LambdaDeploymentPreference is present", () => {
      template.templateMatches({
        Parameters: {
          LambdaDeploymentPreference: {
            Type: "String",
            Default: "AllAtOnce",
          },
        },
      });
    });

    it("Global configuration defines default deployment preference values", () => {
      template.templateMatches({
        Globals: {
          Function: {
            DeploymentPreference: {
              Enabled: false,
              Role: { "Fn::GetAtt": ["CodeDeployServiceRole", "Arn"] },
            },
          },
        },
      });
    });

    const allFunctions = template.findResources("AWS::Serverless::Function");

    // Ensure new functions are tested for canary configuration by maintaining this list of exclusions
    const canaryFunctionExclusionList = [
      "AsyncTxmaEventFunction",
      "JsonWebKeysFunction",
      "ProxyLambda",
    ];

    const canaryFunctions = Object.entries(allFunctions).filter(
      ([functionName, _]) => {
        return !canaryFunctionExclusionList.includes(functionName);
      },
    );

    describe.each(canaryFunctions)(
      "Function definition - %s",
      (canaryFunction: string, canaryFunctionDefinition) => {
        it("correctly configures DeploymentPreference for canaries", () => {
          // Note: retrieveCanaryAlarmNames() relies on the following structure. Endeavour to both if the structure is being altered.
          expect(canaryFunctionDefinition).toMatchObject({
            Properties: {
              DeploymentPreference: {
                Enabled: true,
                Alarms: {
                  "Fn::If": [
                    "UseCanaryDeployment",
                    expect.any(Array),
                    [{ Ref: "AWS::NoValue" }],
                  ],
                },
                Type: {
                  Ref: "LambdaDeploymentPreference",
                },
              },
            },
          });
        });

        const canaryFunctionAlarmNames: any = retrieveCanaryAlarmNames(
          canaryFunctionDefinition,
        );

        const canaryFunctionAlarms = Object.entries(
          template.findResources("AWS::CloudWatch::Alarm"),
        ).filter(([alarmName, _]) => {
          return canaryFunctionAlarmNames.includes(alarmName);
        });

        // Each alarm used as for a canary deployment is required to reference the lambda function by lambda function version ensuring the alarm references the new version only.
        // The following assertions have redundancy. This is kept in as reference and to provide a backstop incase more complex canary alarms are required.
        if (canaryFunctionAlarms.length > 0) {
          it.each(canaryFunctionAlarms)(
            "Canary alarm %s references the function version",
            (_, alarmDefinition) => {
              alarmDefinition.Properties.Metrics.forEach(
                (metricDataQuery: any) => {
                  if (metricDataQuery.MetricStat) {
                    expect(metricDataQuery.MetricStat.Period).toEqual(60);
                    expect(metricDataQuery.MetricStat.Stat).toEqual("Sum");
                  }

                  // Simple test checking at least one dimension in one metric references the lambda function version.
                  expect(alarmDefinition.Properties.Metrics).toMatchObject(
                    expect.arrayContaining([
                      expect.objectContaining({
                        MetricStat: expect.objectContaining({
                          Metric: expect.objectContaining({
                            Dimensions: expect.arrayContaining([
                              {
                                Name: expect.any(String),
                                Value: {
                                  "Fn::GetAtt": [
                                    canaryFunction,
                                    "Version.Version",
                                  ],
                                },
                              },
                            ]),
                          }),
                        }),
                      }),
                    ]),
                  );

                  // Specific test asserting that every metric using our custom metric log filters follows the same definition.
                  if (
                    metricDataQuery.MetricStat?.Metric?.Namespace &&
                    metricDataQuery.MetricStat?.Metric?.Namespace["Fn::Sub"] ==
                      "${AWS::StackName}/LogMessages"
                  ) {
                    expect(
                      metricDataQuery.MetricStat.Metric.Dimensions,
                    ).toEqual(
                      expect.arrayContaining([
                        {
                          Name: "MessageCode",
                          Value: expect.any(String),
                        },
                        {
                          Name: "Version",
                          Value: {
                            "Fn::GetAtt": [canaryFunction, "Version.Version"],
                          },
                        },
                      ]),
                    );
                  }

                  // Specific test asserting that every metric using the AWS metrics follows the same definition.
                  if (
                    metricDataQuery.MetricStat?.Metric?.Namespace ===
                    "AWS/Lambda"
                  ) {
                    expect(
                      metricDataQuery.MetricStat.Metric.Dimensions,
                    ).toEqual(
                      expect.arrayContaining([
                        {
                          Name: "Resource",
                          Value: {
                            "Fn::Sub": "${" + canaryFunction + "}:live",
                          },
                        },
                        {
                          Name: "FunctionName",
                          Value: {
                            Ref: canaryFunction,
                          },
                        },
                        {
                          Name: "ExecutedVersion",
                          Value: {
                            "Fn::GetAtt": [canaryFunction, "Version.Version"],
                          },
                        },
                      ]),
                    );
                  }
                },
              );
            },
          );
        }
      },
    );
  });
});

// Pulls out a list of Alarm names used to configure canary deployments from function definition
// Requires the function definition to match that as defined in the 'correctly configures DeploymentPreference for canaries' test
// Aims to return undefined if that structure is not followed.
function retrieveCanaryAlarmNames(functionDefinition: {
  [key: string]: any; // eslint-disable-line  @typescript-eslint/no-explicit-any
}): string[] | undefined {
  if (
    !functionDefinition.Properties ||
    !functionDefinition.Properties.DeploymentPreference ||
    !functionDefinition.Properties.DeploymentPreference.Alarms ||
    !functionDefinition.Properties.DeploymentPreference.Alarms["Fn::If"] ||
    !functionDefinition.Properties.DeploymentPreference.Alarms["Fn::If"].at(1)
  ) {
    return [];
  }

  const canaryFunctionAlarms =
    functionDefinition.Properties.DeploymentPreference.Alarms["Fn::If"].at(1);

  return canaryFunctionAlarms
    .filter((canaryFunctionAlarm: any) => {
      return typeof canaryFunctionAlarm === "object" && canaryFunctionAlarm.Ref;
    })
    .map((canaryFunctionAlarm: any) => {
      return canaryFunctionAlarm.Ref;
    });
}
