import { Template, Capture, Match } from "aws-cdk-lib/assertions";
const { schema } = require("yaml-cfn");
import { readFileSync } from "fs";
import { load } from "js-yaml";
import { Mappings } from "./helpers/mappings";

// https://docs.aws.amazon.com/cdk/v2/guide/testing.html <--- how to use this file

describe("STS mock infrastructure", () => {
  let template: Template;
  beforeEach(() => {
    let templateYaml: any = load(readFileSync("template.yaml", "utf-8"), {
      schema: schema,
    });
    template = Template.fromJSON(templateYaml);
  });

  describe("API Gateway", () => {
    test("the endpoints are REGIONAL", () => {
      template.hasResourceProperties("AWS::Serverless::Api", {
        Name: { "Fn::Sub": "${AWS::StackName}-sts-mock-api" },
        EndpointConfiguration: "REGIONAL",
      });
    });

    test("it define a DefinitionBody as part of the serverless::api", () => {
      template.hasResourceProperties("AWS::Serverless::Api", {
        DefinitionBody: Match.anyValue(),
      });
    });

    test("it uses the STS mock OpenAPI Spec", () => {
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
      test("metrics are enabled", () => {
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

      test("rate and burst limit mappings are set", () => {
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

      test("rate limit and burst mappings are applied to the API gateway", () => {
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

    test("access log group is attached to the API gateway", () => {
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

    test("access log group has a retention period", () => {
      template.hasResourceProperties("AWS::Logs::LogGroup", {
        RetentionInDays: 30,
        LogGroupName: {
          "Fn::Sub":
            "/aws/apigateway/${AWS::StackName}-sts-mock-api-access-logs",
        },
      });
    });
  });

  describe("Lambda", () => {
    test("all lambdas have a name", () => {
      const lambdas = template.findResources("AWS::Serverless::Function");
      const lambdaList = Object.keys(lambdas);
      lambdaList.forEach((lambda) => {
        expect(lambdas[lambda].Properties.FunctionName).toBeTruthy();
      });
    });

    test("all lambdas have a log group", () => {
      const lambdas = template.findResources("AWS::Serverless::Function");
      const lambdaList = Object.keys(lambdas);
      lambdaList.forEach((lambda) => {
        const functionName = lambdas[lambda].Properties.FunctionName["Fn::Sub"];
        const expectedLogName = {
          "Fn::Sub": `/aws/lambda/${functionName}`,
        };
        template.hasResourceProperties("AWS::Logs::LogGroup", {
          LogGroupName: Match.objectLike(expectedLogName),
        });
      });
    });

    test("all log groups have a retention period", () => {
      const logGroups = template.findResources("AWS::Logs::LogGroup");
      const logGroupList = Object.keys(logGroups);
      logGroupList.forEach((logGroup) => {
        expect(logGroups[logGroup].Properties.RetentionInDays).toEqual(30);
      });
    });
  });

  describe("S3", () => {
    test("all buckets have a name", () => {
      const buckets = template.findResources("AWS::S3::Bucket");
      const bucketList = Object.keys(buckets);
      bucketList.forEach((bucket) => {
        expect(buckets[bucket].Properties.BucketName).toBeTruthy();
      });
    });

    test('all buckets have an associated bucket policy', () => {
      const buckets = template.findResources('AWS::S3::Bucket')
      const bucketList = Object.keys(buckets)
      bucketList.forEach(bucket => {
        template.hasResourceProperties(
            'AWS::S3::BucketPolicy',
            Match.objectLike({
              Bucket: { Ref: bucket },
            }),
        )
      })
    });

    test("all buckets have public access blocked", () => {
      const buckets = template.findResources("AWS::S3::Bucket");
      const bucketList = Object.keys(buckets);
      bucketList.forEach((bucket) => {
        expect(buckets[bucket].Properties.PublicAccessBlockConfiguration).toEqual(expect.objectContaining({
          BlockPublicAcls: true,
          BlockPublicPolicy: true,
          IgnorePublicAcls: true,
          RestrictPublicBuckets: true,
        }));
      });
    });

    test("all buckets have encryption enabled", () => {
      const buckets = template.findResources("AWS::S3::Bucket");
      const bucketList = Object.keys(buckets);
      bucketList.forEach((bucket) => {
        expect(buckets[bucket].Properties.BucketEncryption.ServerSideEncryptionConfiguration).toEqual(expect.arrayContaining([
          expect.objectContaining({
            ServerSideEncryptionByDefault: expect.objectContaining({
              SSEAlgorithm: expect.any(String),
            }),
          })
        ]));
      });
    });
  });
});
