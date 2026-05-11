// Shared helper used by multiple lazy sub-apps.
// Rollup should create a shared chunk for this.
export function timestamp() {
  return new Date().toISOString()
}

export function paginate<T>(items: T[], page: number, perPage: number) {
  const start = (page - 1) * perPage
  return {
    items: items.slice(start, start + perPage),
    total: items.length,
    page,
    perPage,
  }
}
