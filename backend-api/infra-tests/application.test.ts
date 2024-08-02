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

      test("Rate and burst limit mappings are correctly", () => {
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
  });

  describe("Lambdas", () => {
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
  });
});
