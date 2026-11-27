import dotenv from 'dotenv'
import { buildServer } from './server.js'

dotenv.config()

console.info('[INFO]: Starting server')
// Without STATE_FILE, games live in memory only and are lost on restart
const server = buildServer({ stateFile: process.env.STATE_FILE || undefined })

server.listen({ port: parseInt(process.env.PORT!), host: process.env.HOST }, (err, address) => {
  if (err) {
    console.error(err)
    process.exit(1)
  }
  console.info(`[INFO]: Server listening at ${address}`)
})

// Docker sends SIGTERM before replacing the container (on every deployment):
// closing the server saves the state, so games survive the restart.
const stop = async (signal: string) => {
  console.info(`[INFO]: ${signal} received, saving and stopping`)
  await server.close()
  process.exit(0)
}
process.once('SIGTERM', () => stop('SIGTERM'))
process.once('SIGINT', () => stop('SIGINT'))
