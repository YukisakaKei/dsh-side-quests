// Minimal asar reader: list files (optionally filtered) or extract one file.
// Usage:
//   node scripts/asar/asar-tool.cjs list   <asar> [filter] [outfile]
//   node scripts/asar/asar-tool.cjs get    <asar> <innerPath> <outfile>
const fs = require('fs');

function readHeader(asarPath) {
  const fd = fs.openSync(asarPath, 'r');
  const probe = Buffer.alloc(32);
  fs.readSync(fd, probe, 0, 32, 0);
  let jsonOffset, jsonSize, dataBase;
  if (probe.readUInt32LE(0) === 4) {
    // double-pickle format: [4][pickleB total][pickleB payload][jsonLen][json]
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

function listAll(node, prefix, out) {
  if (!node || !node.files) return;
  for (const name of Object.keys(node.files)) {
    const child = node.files[name];
    const p = prefix ? prefix + '/' + name : name;
    if (child.files) listAll(child, p, out);
    else out.push(p + '\t' + (child.size || 0) + '\t' + (child.offset || '0'));
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

const [, , cmd, asarPath, a, b] = process.argv;

if (cmd === 'list') {
  const { fd, header } = readHeader(asarPath);
  const all = [];
  listAll(header, '', all);
  const filter = (a || '').toLowerCase();
  const matched = filter ? all.filter(l => l.toLowerCase().includes(filter)) : all;
  if (b) {
    fs.writeFileSync(b, matched.join('\n'), 'utf8');
    console.log('total=' + all.length + ' matched=' + matched.length + ' -> ' + b);
  } else {
    console.log(matched.join('\n'));
  }
  fs.closeSync(fd);
} else if (cmd === 'get') {
  const { fd, header, dataBase } = readHeader(asarPath);
  const node = findNode(header, a);
  if (!node) { console.error('not found: ' + a); process.exit(1); }
  if (node.unpacked) { console.error('file is unpacked: ' + a); process.exit(2); }
  const buf = Buffer.alloc(node.size);
  fs.readSync(fd, buf, 0, node.size, dataBase + parseInt(node.offset, 10));
  fs.closeSync(fd);
  fs.writeFileSync(b, buf);
  console.log('extracted ' + node.size + ' bytes -> ' + b);
} else {
  console.error('unknown cmd');
  process.exit(1);
}
