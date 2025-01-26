import inquirer from "inquirer";
import { CloudFormationClient, DescribeStacksCommand } from "@aws-sdk/client-cloudformation";
const questions = ["Delete a specific stack?", "Delete a collection of related stacks?"];
const getBaseStackNames = async () => {
    const describeStacksCommand = new DescribeStacksCommand();
    const cloudFormationClient = new CloudFormationClient();
    const response = await cloudFormationClient.send(describeStacksCommand);
    if (!response.Stacks)
        throw Error;
    const stackNames = response.Stacks?.filter((stack) => {
        if (stack.StackName) {
            return stack.StackName.includes(cloudfrontStackNameIdentifier);
        }
    }).map((stack) => {
        return stripCfString(stack.StackName);
    });
    const answer = await inquirer.prompt([{ type: "list", choices: stackNames, message: "Select an option", name: "stack name" }]);
    console.log(answer["stack name"]);
};
const stackQuestion = {
    "Delete a collection of related stacks?": {
        response: true,
        next: getBaseStackNames
    },
    "Delete a specific stack?": {
        response: true,
        next: () => { console.log("individual stack selected"); }
    }
};
const cloudfrontStackNameIdentifier = "-backend-cf-dist";
const stripCfString = (stackName) => {
    return stackName.replace(cloudfrontStackNameIdentifier, "");
};
const singleStackOrStackCollectionResponse = await inquirer.prompt([{ type: "list", choices: questions, message: "Select an option", name: "response" }]);
await stackQuestion[singleStackOrStackCollectionResponse.response].next();
