import assert from 'node:assert/strict';

import { previewText } from '@/lib/format';
import { extractDefaults, extractVariables, fillTemplate, plainBlanks } from '@/lib/templates';

// Blank names that match built-in object properties behave like any other blank.
assert.equal(fillTemplate('Hi {{constructor}}', {}), 'Hi {{constructor}}');
assert.equal(fillTemplate('Hi {{toString}}', {}), 'Hi {{toString}}');
assert.equal(fillTemplate('Hi {{constructor}}', { constructor: 'there' } as Record<string, string>), 'Hi there');
assert.equal(extractDefaults('{{constructor|friend}}').constructor, 'friend');
assert.equal(fillTemplate('{{constructor|friend}}', extractDefaults('{{constructor|friend}}')), 'friend');

// Defaults fill in, and blanks with neither a value nor a default stay.
assert.equal(fillTemplate('{{a}} {{b|two}} {{c}}', { a: 'one' }), 'one two {{c}}');
assert.equal(fillTemplate('{{b|two}}', { b: '' }), 'two');
assert.deepEqual(extractVariables(fillTemplate('{{a}} {{b|two}}', { b: '' })), ['a']);

// Previews read as plain sentences.
assert.equal(plainBlanks('{{ name }} and {{tone|friendly}} and {{ x | y }}'), '[name] and friendly and y');
assert.equal(plainBlanks('{{tone|}}'), '[tone]');
assert.equal(previewText('## Role\nYou are **kind**.\n\n- first {{item}}\n- second'), 'You are kind. first [item] second');
assert.equal(previewText('## Only a heading'), 'Only a heading');
assert.equal(previewText('See [the docs](https://example.com) and `code`'), 'See the docs and code');
console.log('templates: all cases pass');
