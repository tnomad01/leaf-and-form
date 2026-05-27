import { SignJWT } from 'jose'
import { cookies } from 'next/headers'

function getSecret() {
  return new TextEncoder().encode(process.env.ADMIN_COOKIE_SECRET ?? 'dev-secret-32-chars-minimum!!')
}

export async function POST(request: Request) {
  let body: { password?: string }
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  if (!body.password || body.password !== process.env.ADMIN_PASSWORD) {
    return Response.json({ error: 'Invalid password.' }, { status: 401 })
  }

  const token = await new SignJWT({})
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getSecret())

  const cookieStore = await cookies()
  cookieStore.set('admin_session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  })

  return Response.json({ ok: true })
}
