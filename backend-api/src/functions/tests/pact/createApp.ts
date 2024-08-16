import express, { Application, Request, Response } from "express";
import { buildLambdaContext } from "../../testUtils/mockContext";
import { buildRequest } from "../../testUtils/mockRequest";
import { lambdaHandlerConstructor as tokenLambdaHandlerConstructor } from "../../asyncToken/asyncTokenHandler";
import { lambdaHandlerConstructor as credentialLambdaHandlerConstructor } from "../../asyncCredential/asyncCredentialHandler";
import { asyncTokenDependencies } from "./dependencies/asyncTokenDependencies";
import { asyncCredentialDependencies } from "./dependencies/asyncCredentialDependencies";

export async function createApp(): Promise<Application> {
  const app = express();

  app.use(express.urlencoded({ extended: true }));
  app.use(express.json());

  app.post("/async/token", async (req: Request, res: Response) => {
    const result = await tokenLambdaHandlerConstructor(
      asyncTokenDependencies.dependencies,
      buildLambdaContext(),
      buildRequest({ headers: req.headers, body: req.body }),
    );
    res.status(result.statusCode);
    res.send(JSON.parse(result.body));
  });

  app.post("/async/credential", async (req: Request, res: Response) => {
    const result = await credentialLambdaHandlerConstructor(
      asyncCredentialDependencies.dependencies,
      buildRequest({ headers: req.headers, body: JSON.stringify(req.body) }),
    );

    res.status(result.statusCode);
    res.send(JSON.parse(result.body));
  });

  return app;
}
