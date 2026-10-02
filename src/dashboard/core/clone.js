// Deep copy of plain data. Unlike structuredClone it also works on Vue reactive proxies.
export function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value))
}
