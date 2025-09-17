import { Template } from "aws-cdk-lib/assertions";

interface EnvironmentFlags {
  dev: string | boolean | number;
  build: string | boolean | number;
  staging: string | boolean | number;
  integration: string | boolean | number;
  production: string | boolean | number;
}

export class Mappings {
  template: Template;
  readonly environments = [
    "dev",
    "build",
    "staging",
    "integration",
    "production",
  ];
  constructor(template: Template) {
    this.template = template;
  }

  validateMapping(args: {
    environmentFlags: EnvironmentFlags;
    mappingBottomLevelKey: string;
  }) {
    const mappings = this.template.findMappings("EnvironmentVariables");
    for (const env of this.environments) {
      expect(
        mappings["EnvironmentVariables"][args.mappingBottomLevelKey][env],
      ).toStrictEqual(args.environmentFlags[env as keyof EnvironmentFlags]);
      // Typescript needs you to strongly type the key if it's also used as a type
    }
  }
}
