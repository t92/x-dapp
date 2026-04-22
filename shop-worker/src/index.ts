import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { handleError } from './errors'

type Env = {
  Bindings: CloudflareBindings
}
const app = new Hono<Env>()

app.use(
  '*',
  cors({
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
  }),
)

app.use('*', async (c, next) => {
  const start = Date.now()
  console.log(`[request:start] ${c.req.method} ${c.req.path}`)
  await next()
  console.log(
    `[request:end] ${c.req.method} ${c.req.path} status=${c.res.status} duration_ms=${Date.now() - start}`,
  )
})

app.onError((err, c) => {
  console.error(`[error] ${c.req.method} ${c.req.path}:`, err)
  return c.json(
    {
      code: 500,
      message: 'Internal server error',
    },
    500,
  )
})

app.post('/add_product', async (c) => {
  try {
    const { name, price, desc, stock, imgurl, chain_id } = await c.req.json()
    await c.env.DB
      .prepare('INSERT INTO products (name, price, desc, stock, img_url, chain_id) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(name, price, desc, stock, imgurl, chain_id)
      .run()

    return c.json({ code: 200, message: 'product add success' })
  } catch (error) {
    return handleError('/add_product', c, error)
  }
})

app.post('/buy_product', async (c) => {
  try {
    const { product_id, amount, price, chain_id, address } = await c.req.json()
    await c.env.DB
      .prepare('INSERT INTO orders (product_id, amount, price, on_chain_id, user_address) VALUES (?, ?, ?, ?, ?)')
      .bind(product_id, amount, price, chain_id, address)
      .run()
    return c.json({ code: 200, message: 'order add success' })
  } catch (error) {
    return handleError('/buy_product', c, error)
  }
})

app.get('/get_products', async (c) => {
  try {
    const { results } = await c.env.DB
      .prepare('SELECT * FROM products')
      .all()
    return c.json({ code: 200, message: 'get products success', data: results })
  } catch (error) {
    return handleError('/get_products', c, error)
  }
})

app.get('get_orders', async c => {
  try {
    const address = c.req.query('address')
    if (!address) {
      return c.json({ code: 400, message: 'address is required' })
    }
    const { results } = await c.env.DB
      .prepare(` SELECT o.id AS id, o.created_at,
           p.name AS name, p.price AS price
    FROM orders o
    LEFT JOIN products p ON o.product_id = p.id
    WHERE o.user_address = ?
    ORDER BY o.created_at DESC`)
      .bind(address)
      .all()
    return c.json({ code: 200, message: 'get orders success', data: results })
  } catch (error) {
    return handleError('/get_orders', c, error)
  }
})

export default app
