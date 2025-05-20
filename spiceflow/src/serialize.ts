import superjson from 'superjson'

export function superjsonSerialize(value: any, indent = false) {
  // return JSON.stringify(value)
  const { json, meta } = superjson.serialize(value)
  if (json && meta) {
    json['__superjsonMeta'] = meta
  }
  return JSON.stringify(json ?? null, null, indent ? 2 : undefined)
}
