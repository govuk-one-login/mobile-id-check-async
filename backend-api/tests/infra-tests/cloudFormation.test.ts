import { Match, Template } from "aws-cdk-lib/assertions";
import { readFileSync } from "fs";
import { load } from "js-yaml";
import { LoadOptions } from "js-yaml";

const { schema } = require("yaml-cfn");

describe("Infrastructure Stacks", () => {
  let templates: Record<string, Template>;

  beforeEach(() => {
    const loadYamlTemplate = (path: string): Template => {
      const yamlContent = readFileSync(path, "utf-8");
      const jsonContent = load(yamlContent, { schema } as LoadOptions) as { [key: string]: any };
      return Template.fromJSON(jsonContent);
    };

    templates = {
      parent: loadYamlTemplate("infra/parent.yaml"),
      privateApi: loadYamlTemplate("infra/api/privateApi.cloudFormation.yaml"),
      proxyApi: loadYamlTemplate("infra/api/proxyApi.cloudFormation.yaml"),
      sessionsApi: loadYamlTemplate("infra/api/sessionsApi.cloudFormation.yaml"),
      token: loadYamlTemplate("infra/functions/token.cloudFormation.yaml"),
      credential: loadYamlTemplate("infra/functions/credential.cloudFormation.yaml"),
      activeSession: loadYamlTemplate("infra/functions/activeSession.cloudFormation.yaml"),
      biometricToken: loadYamlTemplate("infra/functions/biometricToken.cloudFormation.yaml"),
      jwks: loadYamlTemplate("infra/functions/jwks.cloudFormation.yaml"),
      proxy: loadYamlTemplate("infra/functions/proxy.cloudFormation.yaml"),
      kms: loadYamlTemplate("infra/security/kms.cloudFormation.yaml"),
      roles: loadYamlTemplate("infra/security/roles.cloudFormation.yaml"),
      dynamodb: loadYamlTemplate("infra/storage/dynamodb.cloudFormation.yaml"),
      s3: loadYamlTemplate("infra/storage/s3.cloudFormation.yaml"),
      sqs: loadYamlTemplate("infra/storage/sqs.cloudFormation.yaml"),
      alarms: loadYamlTemplate("infra/monitoring/alarms.cloudFormation.yaml")
    };
  });

  describe("API Stacks", () => {
    describe("Proxy API", () => {
      test("Has security group configuration", () => {
        templates.proxyApi.hasResourceProperties("AWS::EC2::SecurityGroup", Match.objectLike({
          GroupDescription: Match.stringLikeRegexp(".*Lambda.*"),
          GroupName: Match.objectLike({ "Fn::Sub": "${StackName}-proxy-sg" }),
          SecurityGroupEgress: Match.arrayWith([Match.objectLike({
            CidrIp: Match.objectLike({ "Fn::ImportValue": "devplatform-vpc-VpcCidr" }),
            FromPort: 443,
            ToPort: 443,
            IpProtocol: "tcp"
          })])
        }));
      });
    });
  });

  describe("Function Stacks", () => {
    test.each(["token", "credential", "activeSession", "biometricToken", "jwks"])("%s function has required properties", (stackName) => {
      templates[stackName].hasResourceProperties("AWS::Serverless::Function", {
        Runtime: Match.stringLikeRegexp("nodejs[0-9]+.x"),
        Handler: Match.stringLikeRegexp(".*\\.lambdaHandler"),
        Role: Match.anyValue(),
        VpcConfig: Match.objectLike({
          SubnetIds: Match.arrayWith([Match.objectLike({ "Fn::ImportValue": Match.stringLikeRegexp(".*Subnet.*") })]),
          SecurityGroupIds: Match.arrayWith([Match.objectLike({ "Fn::ImportValue": Match.stringLikeRegexp(".*SecurityGroup.*") })])
        })
      });
    });

    test("Proxy function has required properties", () => {
      templates.proxy.hasResourceProperties("AWS::Serverless::Function", {
        Runtime: Match.stringLikeRegexp("nodejs[0-9]+.x"),
        Handler: Match.stringLikeRegexp(".*\\.lambdaHandler"),
        Role: Match.anyValue(),
        VpcConfig: Match.objectLike({
          SecurityGroupIds: [{ Ref: "ProxySecurityGroupId" }]
        })
      });
    });

  });

  describe("Storage Stacks", () => {
    test("DynamoDB table has required properties", () => {
      templates.dynamodb.hasResourceProperties("AWS::DynamoDB::Table", Match.objectLike({
        BillingMode: "PAY_PER_REQUEST",
        SSESpecification: { SSEEnabled: true },
        TimeToLiveSpecification: {
          AttributeName: "timeToLive",
          Enabled: true
        },
        GlobalSecondaryIndexes: Match.arrayWith([Match.objectLike({
          IndexName: "subjectIdentifier-timeToLive-index",
          Projection: Match.objectLike({
            ProjectionType: "INCLUDE",
            NonKeyAttributes: Match.arrayWith(["sessionState", "redirectUri", "clientState"])
          })
        })])
      }));
    });
  });

  describe("Security Stacks", () => {
    test("KMS keys have required properties", () => {
      templates.kms.hasResourceProperties("AWS::KMS::Key", Match.objectLike({
        Enabled: true,
        PendingWindowInDays: { Ref: "PendingDeletionInDays" },
        KeyPolicy: Match.objectLike({
          Version: "2012-10-17",
          Statement: Match.arrayWith([Match.objectLike({
            Effect: "Allow",
            Principal: {
              AWS: Match.objectLike({ "Fn::Sub": Match.stringLikeRegexp("arn:aws:iam::.*:root") })
            },
            Action: Match.arrayWith(["kms:*"])
          })])
        })
      }));
    });
  });

  describe("Monitoring Stack", () => {
    test("Alarms have required properties", () => {
      templates.alarms.hasResourceProperties("AWS::CloudWatch::Alarm", {
        ActionsEnabled: true,
        EvaluationPeriods: Match.anyValue(),
        Threshold: Match.anyValue(),
        AlarmActions: Match.arrayWith([{ Ref: "WarningAlarmsTopic" }]),
        TreatMissingData: "notBreaching"
      });
    });

    test("Alarm metrics use correct namespaces", () => {
      templates.alarms.hasResourceProperties("AWS::CloudWatch::Alarm", Match.objectLike({
        Metrics: Match.arrayWith([
          Match.objectLike({
            MetricStat: Match.objectLike({
              Metric: Match.objectLike({
                Namespace: "AWS/ApiGateway" 
              })
            })
          })
        ])
      }));
    });
  });
});