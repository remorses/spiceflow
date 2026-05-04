"use server"
// Server actions that require authentication. Uses getActionRequest() to read
// the bearer token from the request headers, then validates the session via
// better-auth. Actions that modify data check auth before proceeding.
import { getActionRequest, redirect } from 'spiceflow'
import { auth } from './auth.js'

async function getSession() {
  const request = getActionRequest()
  const session = await auth.api.getSession({ headers: request.headers })
  return session
}

export async function updateProfile(name: string) {
  const session = await getSession()
  if (!session) throw new Error('unauthorized')
  await auth.api.updateUser({ body: { name }, headers: getActionRequest().headers })
  return { updated: true, name }
}

export async function getCurrentUser() {
  const session = await getSession()
  if (!session) throw new Error('unauthorized')
  return {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
  }
}

export async function requireAuthOrRedirect() {
  const session = await getSession()
  if (!session) throw redirect('/login')
  return { userId: session.user.id }
}
