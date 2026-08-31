import { createApp } from './app.js'
import { env } from './config/env.js'

const app = createApp()

app.listen(env.API_PORT, () => {
  console.log(`API de BlackCell escuchando en http://localhost:${env.API_PORT}`)
})
