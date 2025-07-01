import {
  CloudFormationClient,
  DescribeStacksCommand,
} from "@aws-sdk/client-cloudformation";

const cloudFormation = new CloudFormationClient({
  region: "eu-west-2"
});

const protectedStacks = [
  'CTDevPlatformCFTemplateConformance',
  'CTDynatraceServiceDiscoveryReadOnly',
  'CTDynatraceServiceScanNonProdReadOnly',
  'Root-Console-Sign-In-CloudTrail',
  'aws-sam-cli-managed-default',
  'checkov-hook',
  'ctResourceExplorerLocal',
  'dcmaw-lambdanator',
  'ecr-image-scan-findings-logger',
  'l1-platform-vpc',
  'serverlessrepo-lambda-janitor',
]

const existingStacks = []
const response = await cloudFormation.send(new DescribeStacksCommand({}));

for (const stack of response.Stacks) {
  const stackName = stack.StackName

  if (
    stackName.startsWith("devplatform-") 
    || stackName.startsWith("AWSAccelerator-") 
    || stackName.startsWith("awsconfigconforms-") 
    || stackName.startsWith("StackSet-")
    || stackName.startsWith("platform-")
  ) {
    // do nothing
  } else if (protectedStacks.includes(stackName)) {
    // do nothing
  } else {
    existingStacks.push(stackName)
  }
}

console.log(existingStacks.sort())
