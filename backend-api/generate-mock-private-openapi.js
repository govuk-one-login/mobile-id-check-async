import { readFileSync, writeFileSync } from 'fs'
import { parse, stringify } from 'yaml'

const privateOpenApiSpec =  readFileSync('./openApiSpecs/async-private-spec.yaml', 'utf8')
const parsedYaml = parse(privateOpenApiSpec)
const requestMapping =  { 'integration.request.header.Authorization': 'method.request.header.X-Custom-Auth'} 

parsedYaml['paths']['/async/token']['post']['x-amazon-apigateway-integration']['uri']['Fn::Sub'] = "arn:aws:apigateway:${AWS::Region}:lambda:path/2015-03-31/functions/arn:aws:lambda:${AWS::Region}:${AWS::AccountId}:function:${MockAsyncTokenFunction}/invocations"
parsedYaml['paths']['/async/token']['post']['parameters'] =  [{ name: "X-Custom-Auth", in: 'header', required: true, schema: {type: 'string'}}]
writeFileSync("./openApiSpecs/async-mock-private-spec.yaml",stringify(parsedYaml))