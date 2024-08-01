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

    test("It has metrics enabled", () => {
      template.hasResourceProperties(
        "AWS::Serverless::Api",

        {
          Name: { "Fn::Sub": "${AWS::StackName}-private-api" },
          MethodSetting: {
            MetricsEnabled: true,
          },
        },
      );
    });

    test("Rate limiting is set", () => {
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

      template.hasResourceProperties(
        "AWS::Serverless::Api",

        {
          Name: { "Fn::Sub": "${AWS::StackName}-private-api" },
          MethodSetting: {
            ThrottlingRateLimit: {
              "Fn::FindInMap": [
                "PrivateApigw",
                { Ref: "Environment" },
                "ApiRateLimit",
              ],
            },
            ThrottlingBurstLimit: {
              "Fn::FindInMap": [
                "PrivateApigw",
                { Ref: "Environment" },
                "ApiBurstLimit",
              ],
            },
          },
        },
      );
    });
  });
});
