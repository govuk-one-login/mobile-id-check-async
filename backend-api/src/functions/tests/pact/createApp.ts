import express, { Application, Request, Response } from "express";
import { asyncTokenHandlerConstructor } from "./asyncToken/asyncTokenHandlerConstructor";
import { stateConfig } from "./stateConfiguration";

export async function createApp(): Promise<Application> {
  const app = express();

  app.use(express.urlencoded({ extended: true }));
  app.use(express.json());

  app.post("/async/token", async (req: Request, res: Response) => {
    const result = await asyncTokenHandlerConstructor({
      headers: req.headers,
      body: req.body,
      dependencies: stateConfig.asyncTokenDependencies,
    });

    console.log('what is this', transformInvalidJSONToUrlEncodedString(req.body))

    res.status(result.statusCode);
    res.send(JSON.parse(result.body));
  });

  return app;
}


function transformInvalidJSONToUrlEncodedString(body: { [key: string]: string }): string {
  const params = new URLSearchParams(body)
  console.log('params >>>', params)
  const formDataString = params.toString()
  console.log('formDataString >>>', formDataString)
  let jsonString = decodeURIComponent(formDataString)
  console.log('jsonString main func pre slice', jsonString)
  if (jsonString.endsWith("=")) {
    jsonString = jsonString.slice(0, -1)
  }
  console.log('jsonString main func post slice', jsonString)
  console.log(1)

  console.log('what does this look like?', transformToJSONString(jsonString))

  return transformToJSONString(jsonString)

  // return convertJsonStringToUrlEncodedString(fixedJsonColon)
}

function convertJsonStringToUrlEncodedString(jsonString: string): string {
    console.log(2)
    console.log('jsonString 2nd func >>>', jsonString)
  const jsonObject = JSON.parse(jsonString)
  console.log(3)
  const urlEncodedString = Object.keys(jsonObject).map(key => `${encodeURIComponent(key)}=${encodeURIComponent(jsonObject[key])}`).join("&")
  return urlEncodedString
}

function fixMalformedJson(input: string): string {
  // Remove any leading and trailing braces
  const strippedInput = input.trim().slice(1, -1);

  // Use a regular expression to replace the '=' with ':' and add quotes around keys and values
  const fixedJson = strippedInput.replace(/(\w+)=([\w_]+)/g, '"$1":"$2"');

  // Wrap the modified content back in curly braces
  return `{${fixedJson}}`;
}

function fixString(input: string): string {
    console.log('input>>>', input)
  return `${input}"}`;
}



/**
 * Transforms a query-like string into a JSON string.
 * @param data - The input string in the format "key=value&key2=value2".
 * @returns A JSON string representing the key-value pairs.
 */
function transformToJSONString(data: string): string {
  // Initialize an empty object to store the key-value pairs
  const result: Record<string, string> = {};

  // Split the string into key-value pairs
  const pairs = data.split('&');

  // Iterate over each pair
  pairs.forEach(pair => {
      // Split each pair into key and value
      const [key, value] = pair.split('=');

      // Check if both key and value are present
      if (key && value) {
          // Add the key-value pair to the result object
          result[key.trim()] = value.trim();
      }
  });

  // Convert the object to a JSON string
  return JSON.stringify(result);
}