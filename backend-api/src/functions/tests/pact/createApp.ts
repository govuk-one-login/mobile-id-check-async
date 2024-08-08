import express, { Application, Request, Response } from "express";
import { asyncTokenHandlerConstructor } from "./asyncToken/asyncTokenHandlerConstructor";
import { asyncTokenStateConfig } from "./asyncToken/asyncTokenStateConfiguration";
import { asyncCredentialHandlerConstructor } from "./asyncCredential/asyncCredentialHandlerConstructor";
import { asyncCredentialStateConfig } from "./asyncCredential/asyncCredentialStateConfiguration";

export async function createApp(): Promise<Application> {
  const app = express();

  app.use(express.urlencoded({ extended: true }));
  app.use(express.json());

  app.post("/async/token", async (req: Request, res: Response) => {
    const result = await asyncTokenHandlerConstructor({
      headers: req.headers,
      body: req.body,
      dependencies: asyncTokenStateConfig.dependencies,
    });

    res.status(result.statusCode);
    res.send(JSON.parse(result.body));
  });

  app.post("/async/credential", async (req: Request, res: Response) => {
    const result = await asyncCredentialHandlerConstructor({
      headers: req.headers,
      body: JSON.stringify(req.body),
      dependencies: asyncCredentialStateConfig.dependencies,
    });

    res.status(result.statusCode);
    res.send(JSON.parse(result.body));
  });

  return app;
}
