import { Template, Capture, Match } from "aws-cdk-lib/assertions";
import { schema } from "yaml-cfn";
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
        Name: { "Fn::Sub": "${AWS::StackName}-api" },
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
        Name: { "Fn::Sub": "${AWS::StackName}-api" },
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
        template.hasResourceProperties("AWS::Serverless::Api", {
          Name: { "Fn::Sub": "${AWS::StackName}-api" },
          MethodSettings: methodSettings,
        });
        expect(methodSettings.asArray()[0].MetricsEnabled).toBe(true);
      });

      test("rate and burst limit mappings are set", () => {
        const expectedBurstLimits = {
          dev: 10,
          build: 10,
        };
        const expectedRateLimits = {
          dev: 10,
          build: 10,
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
        template.hasResourceProperties("AWS::Serverless::Api", {
          Name: { "Fn::Sub": "${AWS::StackName}-api" },
          MethodSettings: methodSettings,
        });
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
        Name: { "Fn::Sub": "${AWS::StackName}-api" },
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
          "Fn::Sub": "/aws/apigateway/${AWS::StackName}-api-access-logs",
        },
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

    test("Token lambda is attached to a VPC and subnets are protected", () => {
      const lambdaHandlers = [
        "tokenHandler.lambdaHandler",
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
      })
    })

    test("Dequeue lambda is attached to a VPC and subnets are private", () => {
      const lambdaHandlers = [
        "dequeueHandler.lambdaHandler",
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
      })
    })
  });

  describe("S3", () => {
    test("all buckets have a name", () => {
      const buckets = template.findResources("AWS::S3::Bucket");
      const bucketList = Object.keys(buckets);
      bucketList.forEach((bucket) => {
        expect(buckets[bucket].Properties.BucketName).toBeTruthy();
      });
    });

    test("all buckets have an associated bucket policy", () => {
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

    test("all buckets have public access blocked", () => {
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

    test("all buckets have encryption enabled", () => {
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
