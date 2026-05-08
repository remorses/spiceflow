"use server"
// Server actions that require authentication. Uses getActionRequest() to read
// the bearer token from the request headers, then validates the session via
// better-auth. Actions that modify data check auth before proceeding.
import { getActionRequest, redirect } from 'spiceflow'
import { router } from 'spiceflow/react'
import { eq } from 'drizzle-orm'
import { auth, db } from './auth.js'
import * as schema from './schema.js'

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
  if (!session) throw redirect(router.href('/login'))
  return { userId: session.user.id }
}

export async function createOrg(name: string) {
  const session = await getSession()
  if (!session) throw new Error('unauthorized')
  const id = crypto.randomUUID()
  await db.insert(schema.organization).values({
    id,
    name,
    ownerId: session.user.id,
    createdAt: new Date(),
  })
  throw redirect(router.href('/orgs/:orgId/dashboard', { orgId: id }))
}

export async function createProject(orgId: string, name: string) {
  const session = await getSession()
  if (!session) throw new Error('unauthorized')
  const org = await db.query.organization.findFirst({
    where: { id: orgId },
  })
  if (!org || org.ownerId !== session.user.id) throw new Error('forbidden')
  const id = crypto.randomUUID()
  await db.insert(schema.project).values({
    id,
    name,
    orgId,
    createdAt: new Date(),
  })
  return { id, name, orgId }
}

export async function deleteProject(orgId: string, projectId: string) {
  const session = await getSession()
  if (!session) throw new Error('unauthorized')
  const org = await db.query.organization.findFirst({
    where: { id: orgId },
  })
  if (!org || org.ownerId !== session.user.id) throw new Error('forbidden')
  const project = await db.query.project.findFirst({
    where: { id: projectId, orgId },
  })
  if (!project) throw new Error('not found')
  await db.delete(schema.project).where(eq(schema.project.id, projectId))
  throw redirect(router.href('/orgs/:orgId/dashboard', { orgId }))
}
