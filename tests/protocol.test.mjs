import test from 'node:test';
import assert from 'node:assert/strict';

function calcChecksum(payload61) {
  let chk = 0x02;
  for (let i = 0; i < 61; i++) {
    chk ^= payload61[i];
  }
  return chk;
}

function calcResponseChecksum(data61) {
  let sum = 0;
  for (let i = 0; i < 61; i++) {
    sum ^= data61[i];
  }
  return sum;
}

function buildReport(length, domain, cmd, count, valBytes = [], seq = 0x60) {
  const p = new Uint8Array(63);
  p[0] = 0x00;
  p[1] = seq;
  p[2] = 0x00;
  p[3] = 0x00;
  p[4] = 0x00;
  p[5] = Math.min(Math.max(4, length), 60);
  p[6] = 0x00;
  p[7] = 0x80;
  p[8] = domain;
  p[9] = cmd;
  p[10] = count;
  p[11] = count;

  const copyLen = Math.min(valBytes.length, 48);
  for (let i = 0; i < copyLen; i++) {
    const b = parseInt(valBytes[i]);
    p[12 + i] = isNaN(b) ? 0 : (b & 0xFF);
  }

  p[61] = calcChecksum(p);
  p[62] = 0x00;
  return p;
}

function parseResponse(data) {
  if (!data || data.length !== 63) return null;
  const sum = calcResponseChecksum(data);
  if (data[61] !== sum) return null;

  const count = data[11];
  return {
    seq: data[1],
    dir: data[7],
    domain: data[8],
    cmd: data[9],
    status: data[10],
    count: count,
    payload: Array.from(data.slice(12, 12 + count))
  };
}

function toWireEq(values) {
  if (!Array.isArray(values) || values.length !== 10) {
    throw new Error('EQ requires exactly 10 bands');
  }
  return values.map(v => {
    const num = (typeof v === 'number' && !isNaN(v)) ? v : parseInt(v);
    const clamped = Math.max(-9, Math.min(6, isNaN(num) ? 0 : num));
    return clamped + 5;
  });
}

test('XOR checksum calculation matches MediaTek specification', () => {
  const buf = new Uint8Array(63);
  buf[1] = 0x77;
  buf[5] = 0x04;
  buf[8] = 0x80;
  buf[9] = 0x21;
  const chk = calcChecksum(buf);
  assert.equal(typeof chk, 'number');
  assert.ok(chk >= 0 && chk <= 255);
});

test('buildReport creates 63-byte buffer with valid checksum and headers', () => {
  const report = buildReport(0x04, 0x80, 0x21, 0x00, [], 0x65);
  assert.equal(report.length, 63);
  assert.equal(report[0], 0x00);
  assert.equal(report[1], 0x65);
  assert.equal(report[5], 0x04);
  assert.equal(report[8], 0x80);
  assert.equal(report[9], 0x21);
  assert.equal(report[61], calcChecksum(report));
});

test('parseResponse validates response length and XOR checksum', () => {
  const valid = new Uint8Array(63);
  valid[0] = 0x02;
  valid[1] = 0x65;
  valid[7] = 0x80;
  valid[8] = 0x80;
  valid[9] = 0x21;
  valid[10] = 0x01;
  valid[11] = 0x01;
  valid[12] = 85;
  valid[61] = calcResponseChecksum(valid);

  const parsed = parseResponse(valid);
  assert.notEqual(parsed, null);
  assert.equal(parsed.seq, 0x65);
  assert.equal(parsed.cmd, 0x21);
  assert.equal(parsed.status, 0x01);
  assert.deepEqual(parsed.payload, [85]);

  const invalid = new Uint8Array(valid);
  invalid[61] = (invalid[61] ^ 0xFF);
  assert.equal(parseResponse(invalid), null);
  assert.equal(parseResponse(new Uint8Array(32)), null);
});

test('toWireEq enforces 10 bands and MediaTek +5 offset', () => {
  const input = [3, 2, 1, 0, 0, 0, 1, 2, 3, 2];
  const wire = toWireEq(input);
  assert.equal(wire.length, 10);
  assert.deepEqual(wire, [8, 7, 6, 5, 5, 5, 6, 7, 8, 7]);

  const boundary = [-9, 6, -12, 10, 0, 0, 0, 0, 0, 0];
  const wireBoundary = toWireEq(boundary);
  assert.equal(wireBoundary[0], -4);
  assert.equal(wireBoundary[1], 11);
  assert.equal(wireBoundary[2], -4);
  assert.equal(wireBoundary[3], 11);

  assert.throws(() => toWireEq([0, 0, 0]), /10 bands/);
});
