import fs from "fs";
import { readdirSync, readFileSync } from "node:fs";
import { isDeepStrictEqual } from "node:util";
import path from "path";
import * as cfnParse from "yaml-cfn";

export interface CloudFormationTemplate {
  Parameters: { [key: string]: any };
  Mappings: { [key: string]: any };
  Conditions: { [key: string]: any };
  Globals: { [key: string]: any };
  Resources: { [key: string]: any };
  Outputs: { [key: string]: any };
  AWSTemplateFormatVersion?: string;
  [key: string]: any;
}

export function findDifferences(
  path = "",
  mainTemplate: any,
  composedTemplate: any,
): string[] {
  const differences: string[] = [];

  // Handle arrays
  if (Array.isArray(mainTemplate) && Array.isArray(composedTemplate)) {
    if (mainTemplate.length !== composedTemplate.length) {
      differences.push(
        `${path}: Array length: ${composedTemplate.length} vs ${composedTemplate.length}`,
      );
    }
    mainTemplate.forEach((item, i) =>
      differences.push(
        ...findDifferences(`${path}[${i}]`, item, composedTemplate[i]),
      ),
    );
    return differences;
  }

  // Handle objects
  if (
    mainTemplate &&
    composedTemplate &&
    typeof mainTemplate === "object" &&
    typeof composedTemplate === "object"
  ) {
    const allKeys = [
      ...new Set([
        ...Object.keys(mainTemplate),
        ...Object.keys(composedTemplate),
      ]),
    ];

    allKeys.forEach((key) => {
      const keyPath = path ? `${path}.${key}` : key;
      if (!(key in mainTemplate))
        differences.push(`${keyPath}: Missing in first`);
      else if (!(key in composedTemplate))
        differences.push(`${keyPath}: Missing in second`);
      else
        differences.push(
          ...findDifferences(keyPath, mainTemplate[key], composedTemplate[key]),
        );
    });
    return differences;
  }

  // Handle primitives
  if (!isDeepStrictEqual(mainTemplate, composedTemplate)) {
    differences.push(
      `${path}: ${JSON.stringify(mainTemplate)} vs ${JSON.stringify(composedTemplate)}`,
    );
  }

  return differences;
}

export function readTemplate(filePath: string): CloudFormationTemplate {
  const template = cfnParse.yamlParse(readFileSync(filePath, "utf8"));
  return {
    Parameters: template.Parameters,
    Mappings: template.Mappings,
    Conditions: template.Conditions,
    Globals: template.Globals,
    Resources: template.Resources,
    Outputs: template.Outputs,
    AWSTemplateFormatVersion: template.AWSTemplateFormatVersion,
  };
}

export function readAllTemplates(
  dir: string,
  parent: CloudFormationTemplate,
): CloudFormationTemplate {
  const result: CloudFormationTemplate = {
    ...parent,
    Resources: { ...parent.Resources },
  };

  readdirSync(dir, { withFileTypes: true }).forEach((item) => {
    if (item.isDirectory()) {
      const subTemplate = readAllTemplates(path.join(dir, item.name), result);
      Object.assign(result.Resources, subTemplate.Resources);
    } else if (
      item.isFile() &&
      item.name.endsWith(".yaml") &&
      !item.name.includes("parent")
    ) {
      const template = readTemplate(path.join(dir, item.name));
      Object.assign(result.Resources, template.Resources);
    }
  });

  return result;
}

// List all files in a directory in Node.js recursively in a synchronous fashion
export function walkSync(dir: any, filelist: string[] = []): string[] {
  const files = fs.readdirSync(dir);
  files.forEach(function (file) {
    if (fs.statSync(path.join(dir, file)).isDirectory()) {
      filelist = walkSync(path.join(dir, file), filelist);
    } else {
      filelist.push(path.join(dir, file));
    }
  });
  return filelist;
}

export function deepMerge(...objects: object[]) {
  return objects.reduce((aggregation: any, nextObject: any) => {
    Object.keys(nextObject).forEach((key) => {
      const existingValue = aggregation[key];
      const newValue = nextObject[key];

      if (Array.isArray(existingValue) && Array.isArray(newValue)) {
        aggregation[key] = existingValue.concat(...newValue);
      } else if (isObject(existingValue) && isObject(newValue)) {
        aggregation[key] = deepMerge(existingValue, newValue);
      } else {
        aggregation[key] = newValue;
      }
    });
    return aggregation;
  }, {});
}

const isObject = (obj: any) =>
  obj && typeof obj === "object" && !Array.isArray(obj);
