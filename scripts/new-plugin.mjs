#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const root = process.cwd()
const templateDir = path.join(root, 'templates', 'plugin-preview')
const pluginsDir = path.join(root, 'plugins')

function usage() {
  console.error('Usage: npm run new -- <plugin-name> [--title "Display title"] [--ext tcl,sdc]')
}

const args = process.argv.slice(2)
const name = args.find((arg) => !arg.startsWith('--'))

function option(flag, fallback) {
  const index = args.indexOf(flag)
  return index >= 0 && args[index + 1] && !args[index + 1].startsWith('--')
    ? args[index + 1]
    : fallback
}

if (!name) {
  usage()
  process.exit(1)
}

if (!/^[a-z0-9][a-z0-9-]*$/.test(name)) {
  console.error('Plugin name must be lowercase letters, digits, and hyphens.')
  process.exit(1)
}

if (!fs.existsSync(templateDir)) {
  console.error(`Template not found: ${templateDir}`)
  process.exit(1)
}

const targetDir = path.join(pluginsDir, name)
if (fs.existsSync(targetDir)) {
  console.error(`Target already exists: ${targetDir}`)
  process.exit(1)
}

const extensions = option('--ext', 'txt')
  .split(',')
  .map((value) => value.trim().toLowerCase().replace(/^\./, ''))
  .filter(Boolean)

if (extensions.length === 0) {
  console.error('At least one extension is required.')
  process.exit(1)
}

for (const extension of extensions) {
  if (!/^[a-z0-9][a-z0-9.]*$/.test(extension)) {
    console.error(`Invalid extension: ${extension}`)
    process.exit(1)
  }
}

const uniqueExtensions = [...new Set(extensions)]
const title = option('--title', name)
const base = name.replace(/^dsh-/, '')
const localeNamespace =
  'dsh' +
  base
    .split('-')
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join('')
const definitionId = `${name}/preview`

const replacements = {
  __PLUGIN_NAME__: name,
  __PLUGIN_ID__: definitionId,
  __PLUGIN_TITLE__: title,
  __PLUGIN_LOCALE_NS__: localeNamespace,
  __PLUGIN_EXTENSIONS_JSON__: JSON.stringify(uniqueExtensions),
  __PLUGIN_EXTENSIONS_TEXT__: uniqueExtensions.join(', '),
  __DATE__: new Date().toISOString().slice(0, 10)
}

fs.cpSync(templateDir, targetDir, { recursive: true })

const textExtensions = new Set(['.js', '.mjs', '.cjs', '.json', '.md', '.yml', '.yaml', '.txt'])

function replaceInDir(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const absolute = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      replaceInDir(absolute)
      continue
    }
    if (!textExtensions.has(path.extname(entry.name).toLowerCase())) continue
    let text = fs.readFileSync(absolute, 'utf8')
    for (const [placeholder, value] of Object.entries(replacements)) {
      text = text.split(placeholder).join(value)
    }
    fs.writeFileSync(absolute, text)
  }
}

replaceInDir(targetDir)

console.log(`Created plugins/${name}`)
console.log(`  id:        ${definitionId}`)
console.log(`  extensions: ${uniqueExtensions.join(', ')}`)
console.log('')
console.log('Next:')
console.log('  1. npm run check')
console.log('  2. npm test')
console.log(`  3. dsh plugin --profile web add "${path.resolve(targetDir)}"`)
