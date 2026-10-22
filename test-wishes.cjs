const assert=require('node:assert/strict');
const W=require('./wishes.js'),P=require('./local-date-builder.js'),C=require('./local-date-catalog.js');
const wish={id:'hotel:1',name:'A quiet B&B',category:'stays',url:'https://example.com/stay',destination:'mine',preference:'ask',notes:'Private anniversary note',connection:'',favorite:true};
assert.equal(W.read(JSON.stringify({version:1,items:[wish]}))[0].name,wish.name);
assert.throws(()=>W.clean({...wish,category:'intimate'}));
assert.throws(()=>W.clean({...wish,url:'javascript:alert(1)'}));
assert.throws(()=>W.clean({...wish,url:'https://user:password@example.com'}));
assert.throws(()=>W.clean({...wish,destination:'shared'}));
assert.throws(()=>W.read(JSON.stringify({version:1,items:[wish,wish]})));
for(const category of W.categories){const stop=W.stop({...wish,category});const plan=P.clean({...P.empty(),stops:[stop]},C);assert.equal(plan.stops.length,1);assert(!plan.stops[0].notes.includes(wish.notes));assert.equal(plan.stops[0].confirmed,false);assert.equal(plan.stops[0].amount,'');}
console.log('PASS: wish validation, safe links, proposed connection requirements, duplicate rejection, all-category draft handoff and private-note exclusion.');
