import test from 'node:test';
import assert from 'node:assert/strict';
import {exportDate} from '../public/print-date.js';

test('export date uses a lowercase English month and unpadded day in Vietnam time',()=>{
  assert.equal(exportDate(new Date('2026-04-06T03:00:00Z')),'6-april-2026');
  assert.equal(exportDate(new Date('2026-10-13T03:00:00Z')),'13-october-2026');
  assert.equal(exportDate(new Date('2026-04-05T17:00:00Z')),'6-april-2026');
  assert.equal(exportDate(new Date('2026-12-31T17:00:00Z')),'1-january-2027');
});
