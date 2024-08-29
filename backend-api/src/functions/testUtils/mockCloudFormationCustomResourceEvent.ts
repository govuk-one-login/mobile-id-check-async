import { CloudFormationCustomResourceEvent } from "aws-lambda";

export const buildCloudFormationCustomResourceEvent = (
  requestType: string = "Create",
): CloudFormationCustomResourceEvent => {
  return {
    RequestType: requestType,
    ServiceToken: "mockServiceToken",
    ResponseURL: "mockResponseUrl",
    StackId: "mockStackId",
    RequestId: "mockRequestId",
    LogicalResourceId: "mockLogicalResourceId",
    ResourceType: "AWS::CloudFormation::CustomResource",
    PhysicalResourceId: "mockPhysicalResourceId",
    ResourceProperties: {
      ServiceToken: "mockServiceToken",
      FunctionName: "mockFunctionName",
    },
  } as CloudFormationCustomResourceEvent;
};
