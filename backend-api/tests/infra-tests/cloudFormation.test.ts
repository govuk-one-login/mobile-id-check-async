import { Capture, Match, Template } from "aws-cdk-lib/assertions";
import { readFileSync } from "fs";
import { load } from "js-yaml";
import { Mappings } from "./helpers/mappings";

const { schema } = require("yaml-cfn");

describe("Backend cloudfront stacks", () => {
  let template: Template;
  
  beforeEach(() => {
    let yamltemplate: any = load(readFileSync("template.yaml", "utf-8"), {
      schema: schema,
    });
    template = Template.fromJSON(yamltemplate);
  });
});