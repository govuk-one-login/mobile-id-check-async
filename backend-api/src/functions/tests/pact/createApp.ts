import express from 'express'
import { Application, Request, Response } from 'express'
import { asyncTokenHandler } from './asyncToken/asyncTokenHandler'

export async function createApp(): Promise<Application> {
  const app: Application = express()

  app.use(express.urlencoded({ extended: true }))
  app.use(express.json())

  app.post('/async/token', async (req: Request, res: Response) => {

    await asyncTokenHandler()
  })

  return app
}