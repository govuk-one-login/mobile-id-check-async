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
  validatePrivateAPIMapping(args: {
    environmentFlags: EnvironmentFlags;
    mappingBottomLevelKey: string;
  }) {
    this.validateMapping({ ...args, mappingTopLevelKey: "PrivateApigw" });
  }
  validateSessionsApiMapping(args: {
    environmentFlags: EnvironmentFlags;
    mappingBottomLevelKey: string;
  }) {
    this.validateMapping({ ...args, mappingTopLevelKey: "SessionsApigw" });
  }
  validateProxyAPIMapping(args: {
    environmentFlags: EnvironmentFlags;
    mappingBottomLevelKey: string;
  }) {
    this.validateMapping({ ...args, mappingTopLevelKey: "ProxyApigw" });
  }
  validateKMSMapping(args: {
    environmentFlags: EnvironmentFlags;
    mappingBottomLevelKey: string;
  }) {
    this.validateMapping({ ...args, mappingTopLevelKey: "KMS" });
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
      // Typescript needs you to strongly type the key if it's also used as a type
    }
  }
}
