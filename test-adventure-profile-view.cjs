'use strict';
const assert=require('node:assert/strict'),View=require('./adventure-profile-view.js');
assert.equal(View.model({state:'returning',profile:{revision:4,boundaries:{minimalWalking:true}}}).revision,4);
assert.equal(View.model({state:'returning',profile:{revision:4}}).screen,'saved');
assert.equal(View.model({state:'signed_out'}).editable,false);
assert.equal(View.model({state:'revision_conflict'}).screen,'refresh');
assert.equal(View.model({state:'needs_confirmation'}).editable,false);
assert.equal(JSON.stringify(View.model({state:'returning',profile:{revision:4,privateNotes:'secret'}})).includes('secret'),false);
console.log('PASS: safe returning-user display, sign-out, conflicts, fail-closed view, private data exclusion.');
