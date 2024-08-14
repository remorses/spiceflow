// deno-lint-ignore no-explicit-any
export const deepFreeze = (value: any) => {
  for (const key of Reflect.ownKeys(value)) {
    if (value[key] && typeof value[key] === 'object') {
      deepFreeze(value[key]);
    }
  }
  return Object.freeze(value);
};
