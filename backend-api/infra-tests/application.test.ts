import { Template, Capture, Match } from "aws-cdk-lib/assertions";
const { schema } = require("yaml-cfn");
import { readFileSync } from "fs";
import { load } from "js-yaml";
import { Mappings } from "./helpers/mappings";

// https://docs.aws.amazon.com/cdk/v2/guide/testing.html <--- how to use this file

describe("Backend application infrastructure", () => {
  let template: Template;
  beforeEach(() => {
    let yamltemplate: any = load(readFileSync("template.yaml", "utf-8"), {
      schema: schema,
    });
    template = Template.fromJSON(yamltemplate);
  });

  describe("Private APIgw", () => {
    test("The endpoints are Private", () => {
      template.hasResourceProperties("AWS::Serverless::Api", {
        Name: { "Fn::Sub": "${AWS::StackName}-private-api" },
        EndpointConfiguration: "PRIVATE",
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
        template.hasResourceProperties(
          "AWS::Serverless::Api",

          {
            Name: { "Fn::Sub": "${AWS::StackName}-private-api" },
            MethodSettings: methodSettings,
          },
        );
        expect(methodSettings.asArray()[0].MetricsEnabled).toBe(true);
      });

      test("Rate and burst limit mappings are set", () => {
        const expectedBurstLimits = {
          dev: 10,
          build: 0,
          staging: 0,
          integration: 0,
          production: 0,
        };

        const expectedRateLimits = {
          dev: 10,
          build: 0,
          staging: 0,
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
        template.hasResourceProperties(
          "AWS::Serverless::Api",

          {
            Name: { "Fn::Sub": "${AWS::StackName}-private-api" },
            MethodSettings: methodSettings,
          },
        );
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

  describe("Public APIgw", () => {
    test("The endpoints are REGIONAL", () => {
      template.hasResourceProperties("AWS::Serverless::Api", {
        Name: { "Fn::Sub": "${AWS::StackName}-public-api" },
        EndpointConfiguration: "REGIONAL",
      });
    });

    test("It uses the private async OpenAPI Spec", () => {
      template.hasResourceProperties("AWS::Serverless::Api", {
        Name: { "Fn::Sub": "${AWS::StackName}-public-api" },
        DefinitionBody: {
          "Fn::Transform": {
            Name: "AWS::Include",
            Parameters: { Location: "./openApiSpecs/async-public-spec.yaml" },
          },
        },
      });
    });

    describe("APIgw method settings", () => {
      test("Metrics are enabled", () => {
        const methodSettings = new Capture();
        template.hasResourceProperties(
          "AWS::Serverless::Api",

          {
            Name: { "Fn::Sub": "${AWS::StackName}-public-api" },
            MethodSettings: methodSettings,
          },
        );
        expect(methodSettings.asArray()[0].MetricsEnabled).toBe(true);
      });

      test("Rate and burst limit mappings are set", () => {
        const expectedBurstLimits = {
          dev: 10,
          build: 0,
          staging: 0,
          integration: 0,
          production: 0,
        };

        const expectedRateLimits = {
          dev: 10,
          build: 0,
          staging: 0,
          integration: 0,
          production: 0,
        };
        const mappingHelper = new Mappings(template);
        mappingHelper.validatePublicAPIMapping({
          environmentFlags: expectedBurstLimits,
          mappingBottomLevelKey: "ApiBurstLimit",
        });
        mappingHelper.validatePublicAPIMapping({
          environmentFlags: expectedRateLimits,
          mappingBottomLevelKey: "ApiRateLimit",
        });
      });

      test("Rate limit and burst mappings are applied to the APIgw", () => {
        const methodSettings = new Capture();
        template.hasResourceProperties(
          "AWS::Serverless::Api",

          {
            Name: { "Fn::Sub": "${AWS::StackName}-public-api" },
            MethodSettings: methodSettings,
          },
        );
        expect(methodSettings.asArray()[0].ThrottlingBurstLimit).toStrictEqual({
          "Fn::FindInMap": [
            "PublicApigw",
            { Ref: "Environment" },
            "ApiBurstLimit",
          ],
        });

        expect(methodSettings.asArray()[0].ThrottlingRateLimit).toStrictEqual({
          "Fn::FindInMap": [
            "PublicApigw",
            { Ref: "Environment" },
            "ApiRateLimit",
          ],
        });
      });
    });

    test("Access log group is attached to APIgw", () => {
      template.hasResourceProperties("AWS::Serverless::Api", {
        Name: { "Fn::Sub": "${AWS::StackName}-public-api" },
        AccessLogSetting: {
          DestinationArn: {
            "Fn::Sub":
              "arn:${AWS::Partition}:logs:${AWS::Region}:${AWS::AccountId}:log-group:${AsyncCredentialPublicApiAccessLogs}",
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
  describe("Lambdas", () => {
    describe("Globals", () => {
      test("Global environment variables are set", () => {
        const expectedGlobals = [
          "SIGNING_KEY_ID",
          "ISSUER",
          "TXMA_SQS",
          "SESSION_TABLE_NAME",
        ];
        const envVars =
          template.toJSON().Globals.Function.Environment.Variables;
        Object.keys(envVars).every((envVar) => {
          expectedGlobals.includes(envVar);
        });
        expect(expectedGlobals.length).toBe(Object.keys(envVars).length);
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

    test("Create session lambdas have the client registry environment variable", () => {
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
                "Fn::Sub": "${Environment}/clientRegistry",
              },
            },
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
});
