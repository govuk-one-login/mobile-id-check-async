import { Template } from "aws-cdk-lib/assertions";
import { readFileSync } from "fs";
import { load } from "js-yaml";
import { schema } from "yaml-cfn";
import { deepMerge, walkSync } from "../testUtils/testFunctions";

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
});

function loadTemplateFromFile(path: string): Template {
  /* eslint-disable-next-line  @typescript-eslint/no-explicit-any */
  const yamltemplate: any = load(readFileSync(path, "utf-8"), {
    schema: schema,
  });
  return Template.fromJSON(yamltemplate);
}
