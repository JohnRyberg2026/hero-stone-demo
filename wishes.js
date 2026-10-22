'use strict';
const QuestWishes = (() => {
 const destinations={mine:'My Wants & Desires',partner:'Ideas for a Partner',shared:'Our Bucket List — proposed'};
 const preferences={exact:'This Exact One',similar:'Something Like This',choose:'Let My Partner Choose',ask:'Ask Me First',dream:'Just Dreaming'};
 const categories=['closet','meals','cafes','stays','indoors','outdoors','romance','transport','destination','experience'];
 function clean(raw){
  if(!raw||typeof raw!=='object'||!categories.includes(raw.category))throw Error('Choose an eligible category.');
  const str=(k,n)=>{if(typeof raw[k]!=='string'||raw[k].length>n)throw Error('Review '+k+'.');return raw[k].trim();};
  const result={id:str('id',160),name:str('name',120),category:raw.category,url:str('url',2000),destination:raw.destination,preference:raw.preference,notes:str('notes',700),connection:str('connection',120),favorite:raw.favorite===true};
  if(!result.id||!result.name||!Object.hasOwn(destinations,result.destination)||!Object.hasOwn(preferences,result.preference))throw Error('Review this wish.');
  if(result.destination!=='mine'&&!result.connection)throw Error('Name the connection this idea is for.');
  if(result.url){let u;try{u=new URL(result.url);}catch{throw Error('Use a full HTTPS reference link.');}if(u.protocol!=='https:'||u.username||u.password)throw Error('Use a full HTTPS link without account details.');result.url=u.href;}
  return result;
 }
 function read(raw){const d=JSON.parse(raw);if(d.version!==1||!Array.isArray(d.items)||d.items.length>100)throw Error('Saved wishes need review.');const items=d.items.map(clean);if(new Set(items.map(i=>i.id)).size!==items.length)throw Error('Duplicate wish identifiers.');return items;}
 function stop(item){const w=clean(item);return {catalogId:'',name:w.name,category:['destination','experience'].includes(w.category)?'outdoors':w.category,url:w.url,notes:'Saved wish. Confirm current details and participant preferences.',time:'',minutes:'',amount:'',confirmed:false};}
 return {destinations,preferences,categories,clean,read,stop};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=QuestWishes;
if(typeof document!=='undefined')(()=>{
 const M=QuestWishes,key='hs_wishes_v1',panel=document.getElementById('savedWishes');if(!panel)return;
 const $=id=>document.getElementById(id),el=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
 let items=[],selected=null,restoreFocus=null,undo=null;
 const status=text=>{$('wishesStatus').textContent=text;};
 try{const raw=localStorage.getItem(key);if(raw)items=M.read(raw);}catch{status('Saved wishes could not be read. Existing saved data has been left untouched.');}
 function persist(next){localStorage.setItem(key,JSON.stringify({version:1,items:next}));items=next;}
 function button(text,fn){const b=el('button',text);b.type='button';b.onclick=fn;return b;}
 function render(){
  const q=$('wishesSearch').value.trim().toLowerCase(),d=$('wishesDestination').value,c=$('wishesCategory').value;
  const shown=items.filter(w=>(!d||w.destination===d)&&(!c||w.category===c)&&[w.name,w.connection,w.notes].join(' ').toLowerCase().includes(q));
  $('savedWishList').replaceChildren();$('wishesCount').textContent=shown.length+' saved idea'+(shown.length===1?'':'s');
  if(!shown.length)$('savedWishList').append(el('p','Save a listing or add your own idea to begin.'));
  for(const w of shown){const card=el('article');card.className='wish';card.append(el('h3',w.name),el('p',M.destinations[w.destination]+(w.connection?' · '+w.connection:'')),el('p',M.preferences[w.preference]+(w.favorite?' · Favorite ♥':'')));
   if(w.notes){const details=el('details');details.append(el('summary','My notes'),el('p',w.notes));card.append(details);}
   if(w.url){const a=el('a','Open original listing ↗');a.href=w.url;a.target='_blank';a.rel='noopener noreferrer';card.append(a);}
   card.append(button('Edit',()=>open(w)),button('Plan From This',()=>{window.dispatchEvent(new CustomEvent('heartstone:plan-wish',{detail:{stop:M.stop(w),respond:status}}));}),button('Remove',()=>{try{const next=items.filter(i=>i.id!==w.id);persist(next);undo=w;$('undoWish').hidden=false;render();status('Removed. Undo is available.');}catch{status('Could not save the removal. Your wish is still here.');}}));$('savedWishList').append(card);
  }
  document.querySelectorAll('[data-wish-id]').forEach(b=>{b.textContent=items.some(w=>w.id===b.dataset.wishId)?'Saved ✓':'Save for Later ♡';});
 }
 function open(w){if(w){w=items.find(i=>i.id===w.id)||w;}restoreFocus=document.activeElement;selected=w||{id:'own:'+crypto.randomUUID(),name:'',category:'experience',url:'',destination:'mine',preference:'ask',notes:'',connection:'',favorite:false};
  for(const k of ['name','category','url','destination','preference','notes','connection'])$('wish_'+k).value=selected[k];$('wish_favorite').checked=selected.favorite;$('wishSaveError').textContent='';$('wishEditor').showModal();$('wish_name').focus();
 }
 function close(){$('wishEditor').close();restoreFocus?.focus();}
 window.QuestWishUI={open,has:id=>items.some(w=>w.id===id)};
 $('newWish').onclick=()=>open();$('closeWishEditor').onclick=close;
 $('wishEditor').addEventListener('close',()=>restoreFocus?.focus());
 $('savedWishForm').onsubmit=e=>{e.preventDefault();try{const raw={...selected};for(const k of ['name','category','url','destination','preference','notes','connection'])raw[k]=$('wish_'+k).value;raw.favorite=$('wish_favorite').checked;const w=M.clean(raw),next=items.filter(i=>i.id!==w.id);if(next.length>=100)throw Error('This demo holds 100 wishes. Remove one first.');next.push(w);persist(next);undo=null;$('undoWish').hidden=true;render();close();status('Saved on this device. Nothing shared, ordered or booked.');}catch(err){$('wishSaveError').textContent=err.message;}};
 $('undoWish').onclick=()=>{if(!undo)return;try{persist([...items.filter(i=>i.id!==undo.id),undo]);undo=null;$('undoWish').hidden=true;render();status('Wish restored.');}catch{status('Could not restore. Try again.');}};
 for(const id of ['wishesSearch','wishesDestination','wishesCategory'])$(id).addEventListener('input',render);
 render();
})();
