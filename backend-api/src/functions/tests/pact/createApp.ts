import express from "express";
import { Application, Request, Response } from "express";
import { asyncTokenHandlerConstructor } from "./asyncToken/asyncTokenHandlerConstructor";
import { stateConfig } from "./stateConfiguration";

export async function createApp(): Promise<Application> {
  const app = express();

  app.use(express.urlencoded({ extended: true }));
  app.use(express.json());

  app.post("/async/token", async (req: Request, res: Response) => {
    const result = await asyncTokenHandlerConstructor({
      headers: req.headers,
      body: JSON.stringify(req.body),
      dependencies: stateConfig.asyncTokenDependencies,
    });

    res.status(result.statusCode);
    res.send(JSON.parse(result.body));
  });

  return app;
}
