export type Language = 'typescript' | 'python'

export const languageToExtension: Record<Language, string> = {
  typescript: 'ts',
  python: 'py',
  // ruby: 'rb',
  // php: 'php',
  // go: 'go',
  // java: 'java',
  // csharp: 'cs',
  // rust: 'rs',
  // swift: 'swift',
}

export type BoilerplateParams = {
  ClientName: string
  ErrorName: string
  UrlDefault: string
  Version: string
  Author: string
  Repository: string
  PackageName: string
  Description: string
}
