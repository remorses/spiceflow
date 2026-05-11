// Shared utility used by the admin sub-app
export function formatUser(id: string, name: string) {
  return { id, name, formatted: `${name} (#${id})` }
}

export function getDefaultUsers() {
  return [
    { id: 1, name: 'Alice' },
    { id: 2, name: 'Bob' },
    { id: 3, name: 'Charlie' },
  ]
}
