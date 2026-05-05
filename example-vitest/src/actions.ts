"use server"
import { getActionRequest, redirect } from 'spiceflow'
import { projectStore, orgStore, orgProjectStore, getUserByToken } from './main.js'

export async function greetAction(name: string) {
  return { greeting: `hello ${name}` }
}

export async function signalAwareAction() {
  const req = getActionRequest()
  return { aborted: req.signal.aborted, method: req.method }
}

export async function headerReaderAction() {
  const req = getActionRequest()
  return { auth: req.headers.get('authorization') }
}

export async function createProject(name: string) {
  const id = String(projectStore.length + 1)
  const project = { id, name }
  projectStore.push(project)
  return project
}

export async function redirectAction() {
  throw redirect('/about')
}

export async function createOrg(name: string) {
  const req = getActionRequest()
  const token = req.headers.get('authorization')?.slice(7)
  if (!token) throw new Error('unauthorized')
  const user = getUserByToken(token)
  if (!user) throw new Error('unauthorized')
  const id = String(orgStore.length + 1)
  const org = { id, name, ownerId: user.id }
  orgStore.push(org)
  throw redirect(`/orgs/${id}/dashboard`)
}

export async function createOrgProject(orgId: string, name: string) {
  const req = getActionRequest()
  const token = req.headers.get('authorization')?.slice(7)
  if (!token) throw new Error('unauthorized')
  const user = getUserByToken(token)
  if (!user) throw new Error('unauthorized')
  const org = orgStore.find((o) => o.id === orgId)
  if (!org || org.ownerId !== user.id) throw new Error('forbidden')
  const id = String(orgProjectStore.length + 1)
  const project = { id, orgId, name }
  orgProjectStore.push(project)
  return project
}

export async function deleteOrgProject(orgId: string, projectId: string) {
  const req = getActionRequest()
  const token = req.headers.get('authorization')?.slice(7)
  if (!token) throw new Error('unauthorized')
  const user = getUserByToken(token)
  if (!user) throw new Error('unauthorized')
  const org = orgStore.find((o) => o.id === orgId)
  if (!org || org.ownerId !== user.id) throw new Error('forbidden')
  const idx = orgProjectStore.findIndex((p) => p.id === projectId && p.orgId === orgId)
  if (idx === -1) throw new Error('not found')
  orgProjectStore.splice(idx, 1)
  throw redirect(`/orgs/${orgId}/dashboard`)
}
