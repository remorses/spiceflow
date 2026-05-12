// Ambient types for ?split imports
declare module '*?split' {
  const mod: { default: any; [key: string]: any }
  export default mod.default
  export = mod
}
