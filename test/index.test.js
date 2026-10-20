const { test, mock } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { generateCSV, parseColumnString } = require('../dist/index');

// generateCSV logs a status line per call; keep it out of the test reporter stream.
mock.method(console, 'log', () => {});

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'csv-faker-'));

async function generate(columns, opts = {}) {
  const output = path.join(tmpDir, `${Math.random().toString(36).slice(2)}.csv`);
  await generateCSV({ columns, rows: opts.rows ?? 20, output, delimiter: opts.delimiter });
  const [header, ...rows] = fs.readFileSync(output, 'utf8').trim().split('\n');
  const sep = opts.delimiter ?? ',';
  return { header: header.split(sep), rows: rows.map((r) => r.split(sep)) };
}

test('writes header and requested number of rows', async () => {
  const { header, rows } = await generate(
    [{ header: 'id', type: 'uuid' }, { header: 'email', type: 'email' }],
    { rows: 15 },
  );
  assert.deepEqual(header, ['id', 'email']);
  assert.equal(rows.length, 15);
  for (const [id, email] of rows) {
    assert.match(id, /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    assert.match(email, /@/);
  }
});

test('respects custom delimiter', async () => {
  const { header, rows } = await generate(
    [{ header: 'a', type: 'uuid' }, { header: 'b', type: 'uuid' }],
    { delimiter: ';' },
  );
  assert.deepEqual(header, ['a', 'b']);
  for (const row of rows) assert.equal(row.length, 2);
});

test('number stays within min/max and honours decimals', async () => {
  const { rows } = await generate([
    { header: 'int', type: 'number', min: 10, max: 20 },
    { header: 'price', type: 'number', min: 1, max: 5, decimals: 2 },
  ]);
  for (const [int, price] of rows) {
    assert.ok(Number.isInteger(Number(int)) && +int >= 10 && +int <= 20, `int out of range: ${int}`);
    assert.ok(+price >= 1 && +price <= 5, `price out of range: ${price}`);
    assert.ok((price.split('.')[1] ?? '').length <= 2, `too many decimals: ${price}`);
  }
});

test('number honours zero as a bound', async () => {
  const { rows } = await generate([
    { header: 'zero', type: 'number', min: 0, max: 0 },
    { header: 'neg', type: 'number', min: -5, max: 0, decimals: 1 },
  ]);
  for (const [zero, neg] of rows) {
    assert.equal(+zero, 0);
    assert.ok(+neg >= -5 && +neg <= 0, `neg out of range: ${neg}`);
  }
});

test('alphanumeric respects length and uppercase', async () => {
  const { rows } = await generate([{ header: 'code', type: 'alphanumeric', length: 8, uppercase: true }]);
  for (const [code] of rows) assert.match(code, /^[A-Z0-9]{8}$/);
});

test('pick only returns supplied values', async () => {
  const values = ['active', 'inactive', 'pending'];
  const { rows } = await generate([{ header: 'status', type: 'pick', values }]);
  for (const [status] of rows) assert.ok(values.includes(status), `unexpected value: ${status}`);
});

test('pick without values throws', async () => {
  await assert.rejects(generate([{ header: 'x', type: 'pick' }]), /requires values/);
});

test('formula can reference columns declared after it', async () => {
  const { header, rows } = await generate([
    { header: 'total', type: 'formula', formula: (r) => r.qty * r.price },
    { header: 'qty', type: 'number', min: 1, max: 10 },
    { header: 'price', type: 'number', min: 1, max: 10 },
  ]);
  assert.deepEqual(header, ['total', 'qty', 'price']);
  for (const [total, qty, price] of rows) assert.equal(+total, qty * price);
});

test('JSON format writes an array of row objects and defaults to CSV', async () => {
  const jsonOutput = path.join(tmpDir, 'rows.json');
  await generateCSV({
    columns: [{ header: 'enabled', type: 'pick', values: [true] }, { header: 'count', type: 'pick', values: [3] }],
    rows: 2,
    output: jsonOutput,
    format: 'json',
  });
  assert.deepEqual(JSON.parse(fs.readFileSync(jsonOutput, 'utf8')), [
    { enabled: true, count: 3 },
    { enabled: true, count: 3 },
  ]);

  const csvOutput = path.join(tmpDir, 'default.csv');
  await generateCSV({ columns: [{ header: 'value', type: 'pick', values: ['ok'] }], rows: 1, output: csvOutput });
  assert.equal(fs.readFileSync(csvOutput, 'utf8'), 'value\nok\n');
});

test('NDJSON format writes one row object per line', async () => {
  const output = path.join(tmpDir, 'rows.ndjson');
  await generateCSV({
    columns: [{ header: 'value', type: 'pick', values: ['ok'] }],
    rows: 2,
    output,
    format: 'ndjson',
  });
  const lines = fs.readFileSync(output, 'utf8').trim().split('\n');
  assert.deepEqual(lines.map((line) => JSON.parse(line)), [{ value: 'ok' }, { value: 'ok' }]);
});

test('parseColumnString parses header:type', () => {
  assert.deepEqual(parseColumnString('id:uuid'), { header: 'id', type: 'uuid' });
});

test('parseColumnString rejects bad input', () => {
  assert.throws(() => parseColumnString('id'), /Invalid column format/);
  assert.throws(() => parseColumnString('id:nope'), /Invalid data type/);
});

test('CLI generates a file', () => {
  const { execFileSync } = require('node:child_process');
  const output = path.join(tmpDir, 'cli.csv');
  execFileSync(process.execPath, [
    path.join(__dirname, '..', 'dist', 'cli.js'), '-c', 'id:uuid,name:name', '-r', '5', '-o', output,
  ]);
  const lines = fs.readFileSync(output, 'utf8').trim().split('\n');
  assert.equal(lines[0], 'id,name');
  assert.equal(lines.length, 6);
});

test('CLI accepts --format and infers JSON formats from the output extension', () => {
  const { execFileSync } = require('node:child_process');
  const cli = path.join(__dirname, '..', 'dist', 'cli.js');
  const jsonOutput = path.join(tmpDir, 'cli-explicit.json');
  execFileSync(process.execPath, [cli, '-c', 'id:uuid', '-r', '2', '-f', 'json', '-o', jsonOutput]);
  assert.equal(JSON.parse(fs.readFileSync(jsonOutput, 'utf8')).length, 2);

  const ndjsonOutput = path.join(tmpDir, 'cli-inferred.ndjson');
  execFileSync(process.execPath, [cli, '-c', 'id:uuid', '-r', '2', '-o', ndjsonOutput]);
  assert.equal(fs.readFileSync(ndjsonOutput, 'utf8').trim().split('\n').length, 2);
});
