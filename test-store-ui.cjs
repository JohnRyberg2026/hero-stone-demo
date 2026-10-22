const fs=require('fs'),vm=require('vm'),assert=require('assert');
class E{constructor(){this.children=[];this.value='';this.textContent='';this.hidden=false;this.dataset={};this.listeners={};this.checked=false;}append(...x){this.children.push(...x)}replaceChildren(...x){this.children=x;if(x[0]?.tag==='option')this.value=x[0].value;}setAttribute(k,v){this[k]=v}addEventListener(k,v){this.listeners[k]=v}scrollIntoView(){}querySelector(){return submit}}
const html=fs.readFileSync('date-store.html','utf8'),els=Object.fromEntries([...html.matchAll(/id="([^"]+)"/g)].map(x=>[x[1],new E()])),submit=new E(),storage=new Map(),tabs=['closet','intimate','romance'].map(x=>{const e=new E();e.dataset.section=x;return e;});
function defaults(){for(const x of ['wishName','budget','likes','avoid','area','ready','giftNote','productUrl'])els[x].value='';Object.assign(els.recipient,{value:'me'});els.purpose.value='wishlist';els.comfort.value='consider';els.fulfillment.value='decide';}
els.wishForm.reset=defaults;defaults();let allow=true;
const context=vm.createContext({URL,document:{getElementById:id=>els[id],querySelectorAll:()=>tabs,createElement:tag=>Object.assign(new E(),{tag})},window:{addEventListener(){}},confirm:()=>allow,localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)}});
vm.runInContext(fs.readFileSync('store-catalog.js','utf8'),context);
vm.runInContext(fs.readFileSync('date-store.js','utf8'),context);
const text=e=>e.textContent+' '+e.children.map(text).join(' '),choose=(id,name)=>els[id].children.find(x=>x.textContent===name).onclick(),keep=()=>els.wishForm.onsubmit({preventDefault(){}});
assert.equal(els.catalogGrid.children.length,99);els.catalogSearch.value='halter lace bra';els.catalogSearch.oninput();assert.equal(els.catalogGrid.children.length,1);assert(text(els.catalogGrid).toLowerCase().includes('halter lace bra'));assert(!els.catalogGrid.children[0].children.some(x=>x.tag==='img'));els.catalogSearch.value='tankini';els.catalogSearch.oninput();assert.equal(els.catalogGrid.children.length,1);els.catalogGrid.children[0].children.find(x=>x.textContent==='Make This a Little Wish ♡').onclick();assert(els.wishName.value.includes('tankini'));assert.equal(els.productUrl.value,'https://www.amazon.com/dp/B0GVF5ZXT1');els.resetIdea.onclick();
assert(!els.builder.hidden);choose('categories','Dresses');els.wishName.value='A soft dress';els.budget.value='50';keep();assert(text(els.wishList).includes('A soft dress'));
assert(els.intimateGuide.hidden);tabs[1].onclick();assert(!els.adultGate.hidden&&els.builder.hidden&&els.intimateGuide.hidden&&els.storeCollection.hidden);
// A tab click alone must never reveal the adult guide.
assert(!text(els.wishList).includes('Blocked intimate wish'));
const reference=html.match(/<ul class="intimate-name-list" id="intimateNames">([\s\S]*?)<\/ul>/)[1];assert.equal((reference.match(/<li>/g)||[]).length,17);assert(reference.includes('Anal beads'));assert(!/<(?:a|img|input|button|select)\b/i.test(reference));
els.wishName.value='Blocked intimate wish';keep();assert(!text(els.wishList).includes('Blocked intimate wish'));els.wishName.value='';els.closeIntimateGuide.onclick();assert(els.intimateGuide.hidden&&!els.builder.hidden&&!els.storeCollection.hidden);
allow=false;els.saveDraft.onclick();assert.equal(storage.size,0);allow=true;els.saveDraft.onclick();assert.equal(storage.size,1);
els.clearAll.onclick();assert(!text(els.wishList).includes('A soft dress'));els.resumeDraft.onclick();assert(text(els.wishList).includes('A soft dress'));assert(els.total.textContent.includes('$50.00'));
tabs[2].onclick();choose('categories','Wine');assert(!els.wineNotice.hidden);els.wishName.value='Wine from a local winery';keep();assert(!els.wishList.children.at(-1).children.some(x=>x.tag==='a'));
els.deleteDraft.onclick();assert.equal(storage.size,0);assert(text(els.wishList).includes('A soft dress'));
console.log('PASS: kept wishes, display-only intimate names, save cancellation, explicit save/resume, wine planning, independent saved-draft deletion.');
