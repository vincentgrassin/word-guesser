import dotenv from 'dotenv'
import { buildServer } from './server.js'

dotenv.config()

console.info('[INFO]: Starting server')
const server = buildServer()

server.listen({ port: parseInt(process.env.PORT!), host: process.env.HOST }, (err, address) => {
  if (err) {
    console.error(err)
    process.exit(1)
  }
  console.info(`[INFO]: Server listening at ${address}`)
})
