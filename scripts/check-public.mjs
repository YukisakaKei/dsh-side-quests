#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { execFileSync } from 'node:child_process'

const root = process.cwd()
const SELF = path.normalize('scripts/check-public.mjs')
const BINARY_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico', '.pdf',
  '.zip', '.tgz', '.gz', '.asar', '.woff', '.woff2', '.ttf', '.otf'
])

const PATTERNS = [
  { label: 'Windows user path', regex: /C:\\Users\\[^\\\s]+/i },
  { label: 'Git Bash user path', regex: /\/c\/Users\/[^/\s]+/i },
  { label: 'Personal workspace path', regex: /D:\\AI_Agent/i },
  { label: 'Personal username', regex: /huangqiwei/i },
  { label: 'Personal hostname', regex: /LT-HUANGQIWEI/i },
  { label: 'Old personal email', regex: /1367105972@qq\.com/i },
  { label: 'Personal email', regex: /YukisakaKei@outlook\.com/i },
  { label: 'GitHub token', regex: /ghp_[A-Za-z0-9]{20,}/ },
  { label: 'GitHub fine-grained token', regex: /github_pat_[A-Za-z0-9_]{20,}/ },
  { label: 'npm token', regex: /npm_[A-Za-z0-9]{20,}/ },
  { label: 'OpenAI-style key', regex: /sk-[A-Za-z0-9]{20,}/ },
  { label: 'AWS access key', regex: /AKIA[0-9A-Z]{16}/ },
  { label: 'Private key block', regex: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ },
  { label: 'Bearer token', regex: /\bBearer\s+[A-Za-z0-9._~+/-]{20,}/ },
  { label: 'Credential assignment', regex: /\b(?:api[_-]?key|secret|password|token)\s*[:=]\s*['"][^'"]{8,}['"]/i }
]

const PATH_RULES = [
  { label: 'local/ must not be committed', regex: /^local\// },
  { label: 'Tmpdata/ must not be committed', regex: /^Tmpdata\// },
  { label: 'asar/archive must not be committed', regex: /\.(?:asar|tgz|zip)$/i },
  { label: 'node_modules must not be committed', regex: /(^|\/)node_modules\// }
]

function listFiles() {
  try {
    const output = execFileSync(
      'git',
      ['ls-files', '--cached', '--others', '--exclude-standard'],
      { cwd: root, encoding: 'utf8' }
    )
    return output
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
  } catch {
    return walk('.')
  }
}

function walk(relativeDir) {
  const result = []
  const absoluteDir = path.join(root, relativeDir)
  for (const entry of fs.readdirSync(absoluteDir, { withFileTypes: true })) {
    if (entry.name === '.git' || entry.name === 'node_modules') continue
    const relative = path.normalize(path.join(relativeDir, entry.name))
    if (relative.startsWith('local') || relative.startsWith('Tmpdata') || relative.startsWith('tmp')) continue
    if (entry.isDirectory()) {
      result.push(...walk(relative))
    } else {
      result.push(relative)
    }
  }
  return result
}

const findings = []

for (const relative of listFiles()) {
  if (path.normalize(relative) === SELF) continue

  for (const rule of PATH_RULES) {
    if (rule.regex.test(relative)) {
      findings.push({ file: relative, line: 0, label: rule.label })
    }
  }

  if (BINARY_EXTENSIONS.has(path.extname(relative).toLowerCase())) continue

  let text
  try {
    text = fs.readFileSync(path.join(root, relative), 'utf8')
  } catch {
    continue
  }
  if (text.includes('\u0000')) continue

  const lines = text.split(/\r?\n/)
  for (let index = 0; index < lines.length; index += 1) {
    for (const pattern of PATTERNS) {
      if (pattern.regex.test(lines[index])) {
        findings.push({ file: relative, line: index + 1, label: pattern.label })
      }
    }
  }
}

if (findings.length === 0) {
  console.log('OK: no personal paths, emails, tokens, or local-only files found')
} else {
  for (const finding of findings) {
    const location = finding.line > 0 ? `${finding.file}:${finding.line}` : finding.file
    console.error(`FOUND ${location}  ${finding.label}`)
  }
  console.error(`\n${findings.length} finding(s). Fix or move the content to local/ before publishing.`)
  process.exitCode = 1
}
