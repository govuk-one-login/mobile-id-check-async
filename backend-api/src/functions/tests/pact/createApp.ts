import express, { Application, Request, Response } from "express";
import { asyncTokenHandlerConstructor } from "./asyncToken/asyncTokenHandlerConstructor";
import { asyncTokenConfig } from "./asyncToken/asyncTokenConfiguration";
import { asyncCredentialHandlerConstructor } from "./asyncCredential/asyncCredentialHandlerConstructor";
import { asyncCredentialConfig } from "./asyncCredential/asyncCredentialConfiguration";

export async function createApp(): Promise<Application> {
  const app = express();

  app.use(express.urlencoded({ extended: true }));
  app.use(express.json());

  app.post("/async/token", async (req: Request, res: Response) => {
    const result = await asyncTokenHandlerConstructor({
      headers: req.headers,
      body: req.body,
      dependencies: asyncTokenConfig.dependencies,
    });

    res.status(result.statusCode);
    res.send(JSON.parse(result.body));
  });

  app.post("/async/credential", async (req: Request, res: Response) => {
    const result = await asyncCredentialHandlerConstructor({
      headers: req.headers,
      body: JSON.stringify(req.body),
      dependencies: asyncCredentialConfig.dependencies,
    });

    res.status(result.statusCode);
    res.send(JSON.parse(result.body));
  });

  return app;
}
