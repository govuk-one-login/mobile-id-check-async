import { readFileSync, readdirSync } from "fs";
import * as path from "path";
import { isDeepStrictEqual } from "util";
import * as cfnParse from "yaml-cfn";
import {
  findDifferences,
  readAllTemplates,
  readTemplate,
} from "../testUtils/testFunctions";

const templateFilePath = path.join(__dirname, "../../template.yaml");
const infraFolder = path.join(__dirname, "../../infra");
const parentFilePath = path.join(infraFolder, "parent.yaml");

describe("Template", () => {
  it("should have a template.yaml file", () => {
    const mainTemplate = readTemplate(templateFilePath);
    expect(mainTemplate).toBeDefined();
  });

  it("should have a parent.yaml file", () => {
    const parentTemplate = readTemplate(parentFilePath);
    expect(parentTemplate).toBeDefined();
  });

  it("compare parameters of parent and sub templates", () => {
    const parent = readTemplate(templateFilePath);
    const composed = readAllTemplates(infraFolder, parent);

    const parentKeys = Object.keys(parent.Parameters).sort();
    const composedKeys = Object.keys(composed.Parameters).sort();

    expect(parentKeys).toEqual(composedKeys);

    parentKeys.forEach((key) => {
      expect(
        isDeepStrictEqual(parent.Parameters[key], composed.Parameters[key]),
      ).toBe(true);
    });
  });

  it("compare mappings of parent and sub templates", () => {
    const main = readTemplate(templateFilePath);
    const parent = readTemplate(parentFilePath);

    const mainKeys = Object.keys(main.Mappings).sort();
    const parentKeys = Object.keys(parent.Mappings).sort();

    expect(mainKeys).toEqual(parentKeys);

    parentKeys.forEach((key) => {
      console.log("main " + key, main.Mappings[key]);
      console.log("parent " + key, parent.Mappings[key]);
      expect(isDeepStrictEqual(main.Mappings[key], parent.Mappings[key])).toBe(
        true,
      );
    });
  });

  it("compare conditions of parent and sub templates", () => {
    const main = readTemplate(templateFilePath);
    const parent = readTemplate(parentFilePath);

    const mainKeys = Object.keys(main.Conditions).sort();
    const parentKeys = Object.keys(parent.Conditions).sort();

    expect(mainKeys).toEqual(parentKeys);

    parentKeys.forEach((key) => {
      console.log("main " + key, main.Conditions[key]);
      console.log("parent " + key, parent.Conditions[key]);
      expect(
        isDeepStrictEqual(main.Conditions[key], parent.Conditions[key]),
      ).toBe(true);
    });
  });

  it("compare globals of parent and sub templates", () => {
    const main = readTemplate(templateFilePath);
    const parent = readTemplate(parentFilePath);

    const mainKeys = Object.keys(main.Globals).sort();
    const parentKeys = Object.keys(parent.Globals).sort();

    expect(mainKeys).toEqual(parentKeys);

    parentKeys.forEach((key) => {
      console.log("main " + key, main.Globals[key]);
      console.log("parent " + key, parent.Globals[key]);
      expect(isDeepStrictEqual(main.Globals[key], parent.Globals[key])).toBe(
        true,
      );
    });
  });

  it("compare outputs of parent and sub templates", () => {
    const main = readTemplate(templateFilePath);
    const parent = readTemplate(parentFilePath);

    const mainKeys = Object.keys(main.Outputs).sort();
    const parentKeys = Object.keys(parent.Outputs).sort();

    expect(mainKeys).toEqual(parentKeys);

    parentKeys.forEach((key) => {
      console.log("main " + key, main.Outputs[key]);
      console.log("parent " + key, parent.Outputs[key]);
      expect(isDeepStrictEqual(main.Outputs[key], parent.Outputs[key])).toBe(
        true,
      );
    });
  });

  it("sub templates should only have resources", () => {
    readdirSync(infraFolder, { withFileTypes: true }).forEach((item) => {
      if (
        item.isFile() &&
        item.name.endsWith(".yaml") &&
        !item.name.includes("parent") &&
        !item.name.includes("template")
      ) {
        const template = cfnParse.yamlParse(
          readFileSync(path.join(infraFolder, item.name), "utf8"),
        );
        const allowedKeys = ["Resources"];
        const invalidKeys = Object.keys(template).filter(
          (key) => !allowedKeys.includes(key),
        );

        expect(invalidKeys).toHaveLength(0);
      }
    });
  });

  it("parent template should only have a placeholder resource", () => {
    const parent = cfnParse.yamlParse(readFileSync(parentFilePath, "utf8"));
    const resources = parent.Resources || {};
    expect(resources).toStrictEqual({
      NullResource: {
        Type: "AWS::CloudFormation::WaitConditionHandle",
        Condition: "NeverDeploy",
      },
    });
  });

  it("should match template.yaml with sum of its parts", () => {
    const mainTemplate = readTemplate(templateFilePath);
    const parentTemplate = readTemplate(parentFilePath);
    const composedTemplate = readAllTemplates(infraFolder, parentTemplate);

    const differences = findDifferences(
      "Resources",
      mainTemplate.Resources,
      composedTemplate.Resources,
    );

    if (differences.length > 0) {
      // differences.forEach(diff => console.log(diff));
      expect(differences.length).toBe(0); // This will fail with a message showing the differences
    }
  });
});
