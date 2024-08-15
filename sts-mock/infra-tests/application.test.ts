import { Template, Capture, Match } from "aws-cdk-lib/assertions";
const { schema } = require("yaml-cfn");
import { readFileSync } from "fs";
import { load } from "js-yaml";
import { Mappings } from "./helpers/mappings";

// https://docs.aws.amazon.com/cdk/v2/guide/testing.html <--- how to use this file

describe("Backend application infrastructure", () => {
  let template: Template;
  beforeEach(() => {
    let templateYaml: any = load(readFileSync("template.yaml", "utf-8"), {
      schema: schema,
    });
    template = Template.fromJSON(templateYaml);
  });

  describe("API Gateway", () => {
    test("The endpoints are REGIONAL", () => {
      template.hasResourceProperties("AWS::Serverless::Api", {
        Name: { "Fn::Sub": "${AWS::StackName}-sts-mock-api" },
        EndpointConfiguration: "REGIONAL",
      });
    });

    test("It uses the STS mock OpenAPI Spec", () => {
      template.hasResourceProperties("AWS::Serverless::Api", {
        Name: { "Fn::Sub": "${AWS::StackName}-sts-mock-api" },
        DefinitionBody: {
          "Fn::Transform": {
            Name: "AWS::Include",
            Parameters: { Location: "./openApiSpecs/sts-mock-spec.yaml" },
          },
        },
      });
    });

    describe("API Gateway method settings", () => {
      test("Metrics are enabled", () => {
        const methodSettings = new Capture();
        template.hasResourceProperties(
          "AWS::Serverless::Api",
          {
            Name: { "Fn::Sub": "${AWS::StackName}-sts-mock-api" },
            MethodSettings: methodSettings,
          },
        );
        expect(methodSettings.asArray()[0].MetricsEnabled).toBe(true);
      });

      test("Rate and burst limit mappings are set", () => {
        const expectedBurstLimits = {
          dev: 10,
          build: 0,
        };
        const expectedRateLimits = {
          dev: 10,
          build: 0,
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

      test("Rate limit and burst mappings are applied to the API gateway", () => {
        const methodSettings = new Capture();
        template.hasResourceProperties(
          "AWS::Serverless::Api",
          {
            Name: { "Fn::Sub": "${AWS::StackName}-sts-mock-api" },
            MethodSettings: methodSettings,
          },
        );
        expect(methodSettings.asArray()[0].ThrottlingBurstLimit).toStrictEqual({
          "Fn::FindInMap": [
            "StsMockApiGateway",
            { Ref: "Environment" },
            "ApiBurstLimit",
          ],
        });
        expect(methodSettings.asArray()[0].ThrottlingRateLimit).toStrictEqual({
          "Fn::FindInMap": [
            "StsMockApiGateway",
            { Ref: "Environment" },
            "ApiRateLimit",
          ],
        });
      });
    });

    test("Access log group is attached to the API gateway", () => {
      template.hasResourceProperties("AWS::Serverless::Api", {
        Name: { "Fn::Sub": "${AWS::StackName}-sts-mock-api" },
        AccessLogSetting: {
          DestinationArn: {
            "Fn::Sub":
              "arn:${AWS::Partition}:logs:${AWS::Region}:${AWS::AccountId}:log-group:${StsMockApiAccessLogs}",
          },
        },
      });
    });

    test("Access log group has a retention period", () => {
      template.hasResourceProperties("AWS::Logs::LogGroup", {
        RetentionInDays: 30,
        LogGroupName: {
          "Fn::Sub":
            "/aws/apigateway/${AWS::StackName}-sts-mock-api-access-logs",
        },
      });
    });
  });

  describe("Lambdas", () => {
    test("All lambdas have a name", () => {
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
  });

  describe("S3", () => {
    test("All buckets have a name", () => {
      const buckets = template.findResources("AWS::S3::Bucket");
      const buckets_list = Object.keys(buckets);
      buckets_list.forEach((bucket) => {
        expect(buckets[bucket].Properties.BucketName).toBeTruthy();
      });
    });

    test('All buckets have an associated bucket policy', () => {
      const buckets = template.findResources('AWS::S3::Bucket')
      const buckets_list = Object.keys(buckets)
      buckets_list.forEach(bucket => {
        template.hasResourceProperties(
            'AWS::S3::BucketPolicy',
            Match.objectLike({
              Bucket: { Ref: bucket },
            }),
        )
      })
    });
  });
});
