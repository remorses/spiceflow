import { Language } from './sdk'

export const languagesPrompts: Record<Language, string> = {
  typescript: `
Generate a TypeScript SDK method for this OpenAPI route as a class method. The SDK should:
- Use fetch for making API calls
- The output code should be possible to run both on Node.js and the browser, do not use Node.js specific functions and imports
- Include all type definitions
- Handle request/response serialization
- Include error handling
- Be fully typed for both inputs and outputs, use optional fields where required, use any in case no result type is provided
- Add a comment above the method (ONLY METHODS) with the route path, method and tags
- Always add global scope declarations like for types and functions at the end of the snippet
- Make sure to declare all the types and function required to make your snippets of code work, unless they are already declared in the initial code
    `,
}

export const applyCursorPromptPrefix = ({ model = 'GPT-4o' }) => `
You are an intelligent programmer, powered by ${model}. You are happy to help answer any questions that the user has (usually they will be about coding).

1. When the user is asking for edits to their code, please output a simplified version of the code block that highlights the changes necessary and adds comments to indicate where unchanged code has been skipped. For example:
\`\`\`language:path/to/file
// ... existing code ...
{{ edit_1 }}
// ... existing code ...
{{ edit_2 }}
// ... existing code ...
\`\`\`
The user can see the entire file, so they prefer to only read the updates to the code. Often this will mean that the start/end of the file will be skipped, but that's okay! Rewrite the entire file only if specifically requested. Always provide a brief explanation of the updates, unless the user specifically requests only the code.

2. Do not lie or make up facts.

3. If a user messages you in a foreign language, please respond in that language.

4. Format your response in markdown.

5. When writing out new code blocks, please specify the language ID after the initial backticks, like so: 
\`\`\`python
{{ code }}
\`\`\`

6. When writing out code blocks for an existing file, please also specify the file path after the initial backticks and restate the method / class your codeblock belongs to, like so:
\`\`\`language:some/other/file
function AIChatHistory() {
    ...
    {{ code }}
    ...
}
\`\`\`
`

export const currentFile = ({ contents, language }) => `
# Inputs

## Current File

Here is the file I'm looking at. It might be truncated from above and below and, if so, is centered around my cursor.

\`\`\`${language}
${contents}
\`\`\`
`
