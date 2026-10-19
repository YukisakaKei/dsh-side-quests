#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const root = process.cwd()
const pluginsRoot = path.join(root, 'plugins')
const errors = []
const warnings = []

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'))
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

if (!fs.existsSync(pluginsRoot)) {
  console.error('plugins/ not found')
  process.exit(1)
}

const pluginDirs = fs
  .readdirSync(pluginsRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort()

for (const dirName of pluginDirs) {
  const dir = path.join(pluginsRoot, dirName)
  const pkgPath = path.join(dir, 'package.json')
  if (!fs.existsSync(pkgPath)) continue

  const fail = (message) => errors.push(`${dirName}: ${message}`)
  const warn = (message) => warnings.push(`${dirName}: ${message}`)

  let pkg
  try {
    pkg = readJson(pkgPath)
  } catch (error) {
    fail(`package.json is not valid JSON: ${error.message}`)
    continue
  }

  if (pkg.name !== dirName) fail(`package name "${pkg.name}" != directory "${dirName}"`)
  if (pkg.private !== true) fail('package.json must set "private": true')
  if (typeof pkg.version !== 'string' || pkg.version.length === 0) fail('missing version')
  if (pkg.license !== 'MIT') warn('license is not MIT')

  const mainPath = typeof pkg.main === 'string' ? path.join(dir, pkg.main) : null
  if (!mainPath || !fs.existsSync(mainPath)) fail('main entry missing')

  const exportsField = pkg.exports || {}
  const clientExport =
    typeof exportsField['./client'] === 'string'
      ? exportsField['./client']
      : exportsField['./client'] && exportsField['./client'].default
  const clientPath = clientExport ? path.join(dir, clientExport) : null
  if (!clientPath || !fs.existsSync(clientPath)) fail('exports["./client"] missing')

  if (!Array.isArray(pkg.files)) {
    fail('files must be an array')
  } else {
    for (const required of ['lib', 'cordis.patch.yml', 'README.md']) {
      if (!pkg.files.includes(required)) fail(`files must include "${required}"`)
    }
  }

  const dsh = pkg.dsh || {}
  const patchRel = dsh.bundle && dsh.bundle.patch
  const patchPath = patchRel ? path.join(dir, patchRel) : null
  if (!patchPath || !fs.existsSync(patchPath)) fail('dsh.bundle.patch missing')
  if (!dsh.client || dsh.client.platform !== 'web') fail('dsh.client.platform must be "web"')
  if (!dsh.client || !Array.isArray(dsh.client.inject)) fail('dsh.client.inject must be an array')

  if (!fs.existsSync(path.join(dir, 'README.md'))) fail('README.md missing')
  if (!fs.existsSync(path.join(dir, 'CHANGELOG.md'))) warn('CHANGELOG.md missing')

  if (patchPath && fs.existsSync(patchPath)) {
    const text = fs.readFileSync(patchPath, 'utf8')
    if (!new RegExp(`id:\\s*${escapeRegExp(pkg.name)}\\b`).test(text)) {
      fail('cordis.patch.yml is missing the matching id')
    }
    if (!new RegExp(`name:\\s*['"]?${escapeRegExp(pkg.name)}['"]?`).test(text)) {
      fail('cordis.patch.yml is missing the matching name')
    }
  }

  if (clientPath && fs.existsSync(clientPath)) {
    const text = fs.readFileSync(clientPath, 'utf8')
    if (!text.includes('__ModuleLoader__.load')) {
      fail('client entry is missing __ModuleLoader__.load')
    }
    if (!new RegExp(`id:\\s*['"]${escapeRegExp(pkg.name)}['"]`).test(text)) {
      fail('client loader id does not match package name')
    }
  }

  if (mainPath && fs.existsSync(mainPath)) {
    const text = fs.readFileSync(mainPath, 'utf8')
    if (!/export\s+(?:const|function)\s+name|exports\.name/.test(text)) {
      fail('host entry is missing a name export')
    }
    if (!/export\s+(?:const|function)\s+apply|exports\.apply/.test(text)) {
      fail('host entry is missing an apply export')
    }
  }
}

for (const warning of warnings) console.warn(`WARN  ${warning}`)
for (const error of errors) console.error(`ERROR ${error}`)

if (errors.length > 0) {
  console.error(`\n${errors.length} error(s), ${warnings.length} warning(s)`)
  process.exitCode = 1
} else {
  console.log(`OK: ${pluginDirs.length} plugin(s) checked, ${warnings.length} warning(s)`)
}
