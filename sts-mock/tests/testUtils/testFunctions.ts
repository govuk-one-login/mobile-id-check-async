import fs from "fs";
import path from "path";

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
