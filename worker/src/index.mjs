// CloudMail Pro Worker - 最小可用版本
import { Hono } from 'hono'

const app = new Hono()

app.get('/', (c) => c.json({
  name: 'CloudMail Pro',
  version: '1.0.0',
  status: 'running',
}))

app.get('/health', (c) => c.json({ status: 'ok' }))

export default {
  fetch: app.fetch,
}