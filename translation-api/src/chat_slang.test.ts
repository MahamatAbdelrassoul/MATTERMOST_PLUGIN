import assert from 'node:assert/strict';
import {expandChatSlang} from './chat_slang.js';
import {compositeQualityScore} from './semantic_embeddings.js';

assert.equal(expandChatSlang('bjr').text, 'bonjour');
assert.equal(expandChatSlang('bjr').expanded, true);
assert.equal(expandChatSlang('bjr').slangLanguage, 'fr');
assert.equal(expandChatSlang('hello').expanded, false);

const composite = compositeQualityScore(0.1, 0.0, 0.85);
assert.ok(composite > 0.5, `expected high composite when embedding is strong, got ${composite}`);

console.log('chat_slang + semantic tests passed');
