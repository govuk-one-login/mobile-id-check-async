// This script generates the OpenAPI spec used for the Proxy mock. 
// Through using the async-private-spec.yaml as the starting point, it ensures the proxy is as similar as possible to the original API spec.

import { readFileSync, writeFileSync } from 'fs'
import { parse, stringify } from 'yaml'

const privateOpenApiSpec =  readFileSync('./openApiSpecs/async-private-spec.yaml', 'utf8')
const parsedYaml = parse(privateOpenApiSpec)

parsedYaml['paths']['/async/token']['post']['x-amazon-apigateway-integration']['uri']['Fn::Sub'] = "arn:aws:apigateway:${AWS::Region}:lambda:path/2015-03-31/functions/arn:aws:lambda:${AWS::Region}:${AWS::AccountId}:function:${MockProxyLambda}/invocations"
parsedYaml['paths']['/async/token']['post']['parameters'] =  [{ name: "X-Custom-Auth", in: 'header', required: true, schema: {type: 'string'}}]

parsedYaml['paths']['/async/credential']['post']['x-amazon-apigateway-integration']['uri']['Fn::Sub'] = "arn:aws:apigateway:${AWS::Region}:lambda:path/2015-03-31/functions/arn:aws:lambda:${AWS::Region}:${AWS::AccountId}:function:${MockProxyLambda}/invocations"
parsedYaml['paths']['/async/credential']['post']['parameters'] =  [{ name: "X-Custom-Auth", in: 'header', required: true, schema: {type: 'string'}}]
writeFileSync("./openApiSpecs/async-proxy-private-spec.yaml",stringify(parsedYaml))