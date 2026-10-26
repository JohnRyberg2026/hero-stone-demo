const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
let canceled=0,started=0,lastOptions;
const button={textContent:'',disabled:false,setAttribute(k,v){this[k]=v;}},status={},wander={checked:false,disabled:false};
const figure={animate(frames,options){lastOptions=options;started++;return{cancel(){canceled++;}};}};
const reduced={matches:false,addEventListener(k,fn){this.change=fn;},removeEventListener(){}};
const doc={hidden:false,getElementById:id=>id==='meetHeartStone'?{querySelector:()=>figure}:{querySelector:s=>s==='button'?button:s==='[data-wander]'?wander:status},addEventListener(k,fn){this[k]=fn;},removeEventListener(){}};
const win={addEventListener(k,fn){this[k]=fn;}};
vm.runInNewContext(fs.readFileSync('heart-stone-avatar-motion.js','utf8'),{document:doc,window:win,matchMedia:()=>reduced});
assert.equal(started,0);button.onclick();assert.equal(started,1);assert.equal(button['aria-pressed'],'true');button.onclick();assert.equal(canceled,1);
button.onclick();doc.keydown({key:'Escape'});assert.equal(canceled,2);
button.onclick();doc.hidden=true;doc.visibilitychange();assert.equal(canceled,3);button.onclick();assert.equal(started,3);
doc.hidden=false;button.onclick();reduced.matches=true;reduced.change();assert.equal(canceled,4);assert.equal(button.disabled,true);button.onclick();assert.equal(started,4);
reduced.matches=false;reduced.change();assert.equal(started,4);button.onclick();win.pagehide();assert.equal(canceled,5);reduced.matches=true;reduced.change();assert.equal(button.disabled,true);reduced.matches=false;reduced.change();button.onclick();assert.equal(started,6);doc.hidden=true;doc.visibilitychange();assert.equal(canceled,6);
console.log('PASS avatar motion: starts still, explicit start, pause, Escape, visibility stop, reduced motion and page exit.');

doc.hidden=false;wander.checked=true;wander.onchange();assert.equal(started,6);button.onclick();assert.equal(lastOptions.iterations,Infinity);assert.equal(started,7);button.onclick();assert.equal(canceled,7);button.onclick();doc['heartstone:quiet']();assert.equal(canceled,8);assert.equal(wander.checked,false);
wander.checked=true;wander.onchange();button.onclick();reduced.matches=true;reduced.change();assert.equal(wander.checked,false);assert.equal(wander.disabled,true);assert.equal(canceled,9);reduced.matches=false;reduced.change();assert.equal(started,9);assert.equal(wander.disabled,false);
console.log('PASS optional wandering: separate opt-in/start, bounded infinite animation, pause, Quiet and reduced-motion reset.');
