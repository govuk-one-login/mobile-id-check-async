import { Template } from "aws-cdk-lib/assertions";

interface EnvironmentFlags {
  dev: string | boolean | number;
  build: string | boolean | number;
}

export class Mappings {
  template: Template;
  readonly environments = [
    "dev",
    "build",
  ];
  constructor(template: Template) {
    this.template = template;
  }
  validatePrivateAPIMapping(args: {
    environmentFlags: EnvironmentFlags;
    mappingBottomLevelKey: string;
  }) {
    this.validateMapping({ ...args, mappingTopLevelKey: "StsMockApiGateway" });
  }

  private validateMapping(args: {
    environmentFlags: EnvironmentFlags;
    mappingTopLevelKey: string;
    mappingBottomLevelKey: string;
  }) {
    const mappings = this.template.findMappings(args.mappingTopLevelKey);
    for (const env of this.environments) {
      expect(
        mappings[args.mappingTopLevelKey][env][args.mappingBottomLevelKey],
      ).toStrictEqual(args.environmentFlags[env as keyof EnvironmentFlags]);
    }
  }
}
