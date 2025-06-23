import { readFileSync } from "fs";
import * as path from "path";
import { schema } from "yaml-cfn";
import { deepMerge, walkSync } from "../testUtils/testFunctions";
import { Template } from "aws-cdk-lib/assertions";
import { load } from "js-yaml";

const aggregatedTemplate = loadTemplateFromFile("./template.yaml");

describe("Sub-templates", () => {
  it("Aggregated template matches sub-templates", () => {
    const subTemplates = walkSync("./infra")
      .filter((item) => {
        return item.endsWith(".yaml");
      })
      .map(loadTemplateFromFile)
      .map((template) => template.toJSON());
    const mergedSubTemplateJson = deepMerge(...subTemplates);
    expect(aggregatedTemplate.toJSON()).toStrictEqual(mergedSubTemplateJson);
  });

  it("Parent template should only have a placeholder resource", () => {
    const infraFolder = path.join(__dirname, "../../infra");
    const parentTemplatePath = path.join(infraFolder, "parent.yaml");
    const parentTemplate = loadTemplateFromFile(parentTemplatePath).toJSON();

    const resources = parentTemplate.Resources || {};
    expect(resources).toStrictEqual({
      NullResource: {
        Type: "AWS::CloudFormation::WaitConditionHandle",
        Condition: "NeverDeploy",
      },
    });
  });
});

function loadTemplateFromFile(path: string): Template {
  /* eslint-disable-next-line  @typescript-eslint/no-explicit-any */
  const yamlTemplate: any = load(readFileSync(path, "utf-8"), {
    schema: schema,
  });
  return Template.fromJSON(yamlTemplate, {
    skipCyclicalDependenciesCheck: true, // Note: canary alarms falsely trigger the circular dependency check. sam validate --lint (cfn-lint) can correctly handle this so we do not miss out here.
  });
}
