"use server"
import { getActionRequest, redirect } from 'spiceflow'

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

export async function redirectAction() {
  throw redirect('/about')
}
