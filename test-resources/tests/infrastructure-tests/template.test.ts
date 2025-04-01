import { Template } from "aws-cdk-lib/assertions";
import { readFileSync } from "fs";
import { load } from "js-yaml";
import { schema } from "yaml-cfn";
import { deepMerge, walkSync } from "./utils/testFunctions";
import path from "path";

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
  const yamltemplate: any = load(readFileSync(path, "utf-8"), {
    schema: schema,
  });
  return Template.fromJSON(yamltemplate);
}
