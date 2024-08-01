import express from "express";
import { Application, Request, Response } from "express";
// import { asyncTokenHandlerConstructor } from "./asyncToken/asyncTokenHandlerConstructor";

export async function createApp(): Promise<Application> {
  const app: Application = express();

  app.use(express.urlencoded({ extended: true }));
  app.use(express.json());

  app.post("/async/token", async (req: Request, res: Response) => {
    // await asyncTokenHandlerConstructor();

    res.status(200)
    res.send("hello world")
  });

  return app;
}
