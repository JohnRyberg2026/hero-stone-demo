const assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm');
const m=require('./local-date-builder.js'),catalog=require('./local-date-catalog.js');
assert.equal(catalog.length,40);assert.equal(new Set(catalog.map(b=>b.id)).size,40);
for(const b of catalog){assert(m.categories[b.category]);assert(m.url(b.url));assert(m.url(b.sourceUrl));assert(b.practical&&b.description);assert.equal(b.member,false);assert.equal(b.referred,false);}
assert(!catalog.some(b=>/indigenous/i.test(b.name)));
assert(catalog.find(b=>b.id==='mote').address.includes('225 University'));
assert(catalog.find(b=>b.id==='evies').practical.includes('1–5'));
assert(catalog.find(b=>b.id==='livingstons').practical.includes('closed'));
assert.equal(m.select(catalog,{source:'members'}).length,0);assert.equal(m.select(catalog,{source:'referred'}).length,0);
assert(!m.select(catalog,{noWater:true}).some(b=>b.hazards.includes('water')));assert(!m.select(catalog,{noHeights:true}).some(b=>b.hazards.includes('heights')));assert(!m.select(catalog,{easy:true}).some(b=>b.effort==='active'));
assert(m.select(catalog,{category:'stays'}).some(b=>b.kind==='Cabins'));assert(m.select(catalog,{category:'stays'}).some(b=>b.kind==='Motel'));
const stop={catalogId:'mote',name:'ignored',category:'indoors',url:'',notes:'Our idea',time:'14:00',minutes:120,amount:'50',confirmed:false};
let p=m.clean({...m.empty(),limit:'100',stops:[stop,{...stop,catalogId:'',category:'meals',name:'At home',amount:'',minutes:30}]},catalog);assert.deepEqual(m.totals(p),{amount:50,unknown:1,minutes:150,nights:0});
assert(!('height' in m.clean({...p,height:'170'},catalog)));assert(!('braCup' in m.clean({...p,stops:[{...stop,braCup:'D'}]},catalog).stops[0]));
assert.throws(()=>m.clean({...p,limit:'-1'},catalog));assert.throws(()=>m.clean({...p,stops:[{...stop,catalogId:'missing'}]},catalog));assert.throws(()=>m.clean({...p,stops:[{...stop,catalogId:'',url:'javascript:alert(1)'}]},catalog));assert.throws(()=>m.clean({...p,stops:[{...stop,minutes:-5}]},catalog));assert.throws(()=>m.clean({...p,stops:Array(21).fill(stop)},catalog));
assert(m.summary(p,catalog).includes('Nothing booked'));assert(m.summary(p,catalog).includes('1 undecided'));
// Exercise real event handlers with a small DOM and storage adapter.
class E{constructor(tag='div'){this.tag=tag;this.children=[];this.value='';this.textContent='';this.hidden=false;this.checked=false;this.open=false;this.disabled=false;}append(...x){this.children.push(...x)}replaceChildren(...x){this.children=x;if(x[0]?.tag==='option')this.value=x[0].value;}setAttribute(k,v){this[k]=v}scrollIntoView(){}focus(){this.focused=true}reset(){for(const k of ['localOwnName','localOwnUrl','localOwnNotes'])els[k].value='';els.localOwnCategory.value='meals';}}
const html=fs.readFileSync('date-store.html','utf8'),els=Object.fromEntries([...html.matchAll(/id="([^"]+)"/g)].map(x=>[x[1],new E()]));els.localSource.value='independent';els.localReview.hidden=true;let allow=true,copy='',events={},storage=new Map();
const win={addEventListener:(type,fn)=>(events[type]??=[]).push(fn),dispatchEvent:e=>(events[e.type]||[]).forEach(fn=>fn(e))};
class CE{constructor(type,init={}){this.type=type;this.detail=init.detail;}}
const context=vm.createContext({URL,console,Math,document:{getElementById:id=>els[id],createElement:tag=>new E(tag)},window:win,CustomEvent:CE,confirm:()=>allow,localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},navigator:{clipboard:{writeText:async t=>{copy=t;}}}});
vm.runInContext(fs.readFileSync('local-date-catalog.js','utf8'),context);vm.runInContext(fs.readFileSync('local-date-builder.js','utf8'),context);
const text=e=>e.textContent+' '+e.children.map(text).join(' '),btn=(e,name)=>e.children.find(x=>x.tag==='button'&&x.textContent===name);
assert.equal(els.localResults.children.length,6);
assert.equal(catalog.filter(b=>b.category==='meals'&&b.priceLevel>=1&&b.priceLevel<=5).length,6);
assert(m.priceLabel(catalog[0]).includes('Estimated price:'));assert(m.priceLabel(catalog[0]).includes('$25–$39.99'));
assert(m.select(catalog,{priceLevel:'2'}).every(b=>b.category==='meals'&&b.priceLevel===2));
assert.equal(m.select(catalog,{priceLevel:'5'}).length,0);
assert.equal(m.select(catalog,{category:'cafes',priceLevel:'2'}).length,0);
els.localPrice.value='4';els.localPrice.onchange();assert.equal(els.localResults.children.length,1);assert(text(els.localResults).includes('Connors'));els.localResetFilters.onclick();assert.equal(els.localPrice.value,'');assert.equal(els.localResults.children.length,6);
els.localResults.children[0].children.at(-1).children.at(-1).onclick();assert(text(els.localPlanStops).includes('Owen'));assert.equal(els.localResults.children[0].children.at(-1).children.at(-1).disabled,true);
let inputs=els.localPlanStops.children[0].children.find(x=>x.className==='local-stop-fields');inputs.children[1].children[0].value='45';inputs.children[1].children[0].onchange();inputs.children[0].children[0].value='18:30';inputs.children[0].children[0].onchange();assert(els.planTotals.textContent.includes('$45.00'));
allow=false;els.localSave.onclick();assert.equal(storage.size,0);allow=true;els.localSave.onclick();assert.equal(storage.size,1);
assert(JSON.parse([...storage.values()][0]).stops[0].time==='18:30');els.localClear.onclick();assert(text(els.localPlanStops).includes('first possibility'));els.localResume.onclick();assert(text(els.localPlanStops).includes('Owen'));assert(els.planTotals.textContent.includes('$45.00'));
els.localSource.value='members';els.localSource.onchange();assert(text(els.localResults).includes('No matches'));els.localSource.value='independent';els.localSource.onchange();els.localSurprise.onclick();assert.equal(els.localResults.children.length,3);assert.equal(els.localPlanStops.children.length,1);
els.localOwnName.value='Our porch';els.localOwnCategory.value='meals';els.localOwnUrl.value='javascript:alert(1)';els.localCustomForm.onsubmit({preventDefault(){}});assert(els.localStatus.textContent.includes('HTTPS'));els.localOwnUrl.value='';els.localCustomForm.onsubmit({preventDefault(){}});assert(text(els.localPlanStops).includes('Our porch'));
let controls=els.localPlanStops.children[1].children.at(-1);btn(controls,'↑ Earlier').onclick();assert(text(els.localPlanStops.children[0]).includes('Our porch'));
win.dispatchEvent(new CE('heartstone:kept-wishes',{detail:[{name:'A blue dress',url:'https://www.amazon.com/dp/B0FWQY2BHJ',amount:'30',height:'170'}]}));assert(text(els.localPlanStops).includes('A blue dress'));assert(!text(els.localPlanStops).includes('170'));
els.localReviewButton.onclick();assert(!els.localReview.hidden);assert(els.localReviewText.textContent.includes('Our porch'));assert(els.localReviewText.textContent.includes('$75.00'));els.localCloseReview.onclick();assert(els.localReview.hidden);
const sizeBefore=els.localPlanStops.children.length;storage.set('hs_local_date_plan_v1','{"version":1,"stops":[{"catalogId":"unknown"}]}');els.localResume.onclick();assert.equal(els.localPlanStops.children.length,sizeBefore);els.localDelete.onclick();assert.equal(storage.size,0);assert.equal(els.localPlanStops.children.length,sizeBefore);
console.log('PASS: 40 sourced listings; filters; no invented memberships; safe drafts; budgets; reorder; custom ideas; explicit saves; wish import; review; corrupt-draft recovery.');
