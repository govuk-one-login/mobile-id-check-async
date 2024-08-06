import express, { Application, Request, Response } from "express";
import { asyncTokenHandlerConstructor } from "./asyncToken/asyncTokenHandlerConstructor";
import { asyncTokenStateConfig } from "./asyncToken/asyncTokenStateConfiguration";

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

    res.status(200);
    res.send('Hello, World');
  });

  return app;
}
