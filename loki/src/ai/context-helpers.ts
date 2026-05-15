import type { TerminalContext } from './context-collector'

const PROJECT_INDICATORS: Record<string, string> = {
  'package.json': 'Node.js',
  'Cargo.toml': 'Rust',
  'go.mod': 'Go',
  'requirements.txt': 'Python',
  'pyproject.toml': 'Python',
  'Pipfile': 'Python',
  'Gemfile': 'Ruby',
  'pom.xml': 'Java',
  'build.gradle': 'Java',
  'build.gradle.kts': 'Java',
  'CMakeLists.txt': 'C/C++',
  'Makefile': 'C/C++',
  'composer.json': 'PHP',
  'mix.exs': 'Elixir',
  'pubspec.yaml': 'Dart/Flutter',
  'tsconfig.json': 'TypeScript',
}

export function detectProjectType(files: string[]): string | null {
  for (const file of files) {
    if (PROJECT_INDICATORS[file]) return PROJECT_INDICATORS[file]
  }
  return null
}

export function buildContextPrompt(ctx: TerminalContext): string {
  const lines: string[] = ['[Terminal Context]']

  lines.push(`OS: ${ctx.os}`)
  if (ctx.shell) lines.push(`Shell: ${ctx.shell}`)
  if (ctx.currentDirectory) lines.push(`Current Directory: ${ctx.currentDirectory}`)
  if (ctx.activeProject) lines.push(`Project Type: ${ctx.activeProject}`)

  if (ctx.recentCommands.length > 0) {
    lines.push('Recent Commands:')
    for (const cmd of ctx.recentCommands.slice(-5)) {
      const status = cmd.exitCode === 0 ? '' : ` (exit: ${cmd.exitCode})`
      lines.push(`  $ ${cmd.command}${status}`)
    }
  }

  if (ctx.lastErrorOutput) {
    const truncated = ctx.lastErrorOutput.split('\n').slice(0, 10).join('\n')
    lines.push(`Last Error Output:\n\`\`\`\n${truncated}\n\`\`\``)
  }

  return lines.join('\n')
}
