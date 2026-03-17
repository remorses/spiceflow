// Vendored from copy-anything@3.0.5 + is-what@4.1.8 to remove external dependencies.
// https://github.com/mesqueeb/copy-anything
// Deep recursive clone of plain objects and arrays.

function getType(payload: unknown): string {
  return Object.prototype.toString.call(payload).slice(8, -1)
}

function isArray(payload: unknown): payload is unknown[] {
  return getType(payload) === 'Array'
}

function isPlainObject(payload: unknown): payload is Record<PropertyKey, unknown> {
  if (getType(payload) !== 'Object') return false
  const prototype = Object.getPrototypeOf(payload)
  return (
    !!prototype &&
    prototype.constructor === Object &&
    prototype === Object.prototype
  )
}

function assignProp(
  carry: Record<PropertyKey, unknown>,
  key: PropertyKey,
  newVal: unknown,
  originalObject: Record<PropertyKey, unknown>,
  includeNonenumerable?: boolean,
): void {
  const propType = {}.propertyIsEnumerable.call(originalObject, key)
    ? 'enumerable'
    : 'nonenumerable'
  if (propType === 'enumerable') carry[key] = newVal
  if (includeNonenumerable && propType === 'nonenumerable') {
    Object.defineProperty(carry, key, {
      value: newVal,
      enumerable: false,
      writable: true,
      configurable: true,
    })
  }
}

export interface CopyOptions {
  props?: PropertyKey[]
  nonenumerable?: boolean
}

export function copy<T>(target: T, options: CopyOptions = {}): T {
  if (isArray(target)) {
    return target.map((item) => copy(item, options)) as T
  }
  if (!isPlainObject(target)) {
    return target
  }
  const props = Object.getOwnPropertyNames(target)
  const symbols = Object.getOwnPropertySymbols(target)
  return [...props, ...symbols].reduce(
    (carry, key) => {
      if (isArray(options.props) && !options.props.includes(key)) {
        return carry
      }
      const val = target[key]
      const newVal = copy(val, options)
      assignProp(
        carry as Record<PropertyKey, unknown>,
        key,
        newVal,
        target as Record<PropertyKey, unknown>,
        options.nonenumerable,
      )
      return carry
    },
    {} as T,
  )
}
