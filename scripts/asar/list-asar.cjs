// Minimal asar header parser: list file paths matching a filter.
// Usage:
//   node scripts/asar/list-asar.cjs <asar> [filter] [outfile]
// asar format: UInt32 headerPickleSize, Pickle(UInt32 jsonSize, json, padding)
const fs = require('fs');

const asarPath = process.argv[2];
const filter = (process.argv[3] || '').toLowerCase();
const outPath = process.argv[4];

const fd = fs.openSync(asarPath, 'r');
const buf = Buffer.alloc(8);
fs.readSync(fd, buf, 0, 8, 0);
const jsonSize = buf.readUInt32LE(4);
const jsonBuf = Buffer.alloc(jsonSize);
fs.readSync(fd, jsonBuf, 0, jsonSize, 8);
fs.closeSync(fd);

const header = JSON.parse(jsonBuf.toString('utf8'));
const lines = [];

function walk(node, prefix) {
  if (!node.files) return;
  for (const name of Object.keys(node.files)) {
    const child = node.files[name];
    const p = prefix ? prefix + '/' + name : name;
    if (child.files) {
      walk(child, p);
    } else {
      lines.push(p + '\t' + (child.size || 0) + '\t' + (child.offset || '0'));
    }
  }
}
walk(header.files ? header : { files: header.files }, '');

const matched = filter ? lines.filter(l => l.toLowerCase().includes(filter)) : lines;
const out = matched.join('\n');
if (outPath) {
  fs.writeFileSync(outPath, out, 'utf8');
  console.log('total files: ' + lines.length + ', matched: ' + matched.length + ', written to ' + outPath);
} else {
  console.log(out);
}
