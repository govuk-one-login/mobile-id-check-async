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
      body: req.body,
      dependencies: stateConfig.dependencies,
    });

    console.log("result.statusCode >>>>>", result.statusCode);
    console.log("result.body >>>>>", result.body);
    console.log("result", result)

    res.status(result.statusCode);
    res.send(result);
  });

  return app;
}
