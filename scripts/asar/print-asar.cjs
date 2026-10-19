// List or dump files from app.asar straight to stdout (no file writes).
// usage:
//   node scripts/asar/print-asar.cjs list <asar> <filter>
//   node scripts/asar/print-asar.cjs get  <asar> <innerPath>
//   node scripts/asar/print-asar.cjs lines <asar> <innerPath> <from> <count>
const fs = require('fs');

function readHeader(asarPath) {
  const fd = fs.openSync(asarPath, 'r');
  const probe = Buffer.alloc(32);
  fs.readSync(fd, probe, 0, 32, 0);
  let jsonOffset, jsonSize, dataBase;
  if (probe.readUInt32LE(0) === 4) {
    jsonSize = probe.readUInt32LE(12);
    jsonOffset = 16;
    dataBase = 8 + 4 + probe.readUInt32LE(8);
  } else {
    jsonSize = probe.readUInt32LE(4);
    jsonOffset = 8;
    dataBase = 8 + jsonSize + ((4 - (jsonSize % 4)) % 4);
  }
  const jsonBuf = Buffer.alloc(jsonSize);
  fs.readSync(fd, jsonBuf, 0, jsonSize, jsonOffset);
  const header = JSON.parse(jsonBuf.toString('utf8'));
  return { fd, header, dataBase };
}

function walk(node, prefix, out) {
  if (!node || !node.files) return;
  for (const name of Object.keys(node.files)) {
    const child = node.files[name];
    const p = prefix ? prefix + '/' + name : name;
    if (child.files) walk(child, p, out);
    else out.push({ path: p, size: child.size || 0, offset: child.offset || '0', unpacked: !!child.unpacked });
  }
}

function findNode(header, innerPath) {
  const parts = innerPath.split('/').filter(Boolean);
  let node = header;
  for (const part of parts) {
    if (!node.files || !node.files[part]) return null;
    node = node.files[part];
  }
  return node;
}

const [, , cmd, asarPath, a, b, c] = process.argv;

if (cmd === 'list') {
  const { fd, header } = readHeader(asarPath);
  const all = [];
  walk(header, '', all);
  fs.closeSync(fd);
  const filter = (a || '').toLowerCase();
  const matched = all.filter(e => !filter || e.path.toLowerCase().includes(filter));
  for (const e of matched) console.log(e.path + '\t' + e.size + '\t' + e.offset + (e.unpacked ? '\tUNPACKED' : ''));
} else if (cmd === 'get' || cmd === 'lines') {
  const { fd, header, dataBase } = readHeader(asarPath);
  const node = findNode(header, a);
  if (!node || node.files) { console.error('not a file: ' + a); process.exit(1); }
  if (node.unpacked) {
    fs.closeSync(fd);
    const buf = fs.readFileSync(a);
    console.log(buf.toString('utf8'));
    process.exit(0);
  }
  const buf = Buffer.alloc(node.size);
  fs.readSync(fd, buf, 0, node.size, dataBase + parseInt(node.offset, 10));
  fs.closeSync(fd);
  if (cmd === 'get') {
    console.log(buf.toString('utf8'));
  } else {
    const from = parseInt(b, 10) || 1;
    const count = parseInt(c, 10) || 200;
    const lines = buf.toString('utf8').split(/\r?\n/);
    const out = lines.slice(from - 1, from - 1 + count);
    out.forEach((l, i) => console.log(String(from + i).padStart(7) + ': ' + l));
  }
} else {
  console.error('unknown cmd');
  process.exit(1);
}
