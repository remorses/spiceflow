"use server"
import { getActionRequest, redirect } from 'spiceflow'
import { projectStore } from './main.js'

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
