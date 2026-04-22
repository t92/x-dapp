import type { Context } from 'hono'

type ErrorResponse = {
  code: number
  message: string
  error?: string
}

export function handleError(path: string, ctx: Context, error: unknown) {
  console.error(path, error)

  const errorMessage = error instanceof Error ? error.message : String(error)

  return ctx.json<ErrorResponse>(
    { code: 500, message: 'Internal server error', error: errorMessage },
    500,
  )
}
