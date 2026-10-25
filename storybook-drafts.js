/* Private Living Story Book draft model. No storage, generated memories, sharing
   or network actions. Actor checks are model invariants, not server authorization. */
(function(root){
 'use strict';
 const copy=value=>JSON.parse(JSON.stringify(value));
 function text(value,max){if(typeof value!=='string'||!value.trim()||value.length>max)throw Error('Add valid text.');return value.trim();}
 function exact(value,keys){if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(k=>!keys.includes(k)))throw Error('Unsupported draft fields.');}
 function date(value,year){
  if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))throw Error('Choose the date this happened.');
  const d=new Date(value+'T12:00:00Z');
  if(!Number.isFinite(d.getTime())||d.toISOString().slice(0,10)!==value||d.getUTCFullYear()!==year)throw Error('Use a real date in this annual volume.');
  return d.getUTCMonth()+1;
 }
 function check(book,actor,revision){
  if(!actor||!book||book.owner!==actor||book.visibility!=='private')throw Error('This is a private personal book.');
  if(revision!==undefined&&revision!==book.revision)throw Error('The draft changed. Reload before editing.');
 }
 function create(actor,input){
  exact(input,['id','year','title']);
  if(!actor||!Number.isInteger(input.year)||input.year<1900||input.year>9999)throw Error('Choose an owner and annual volume.');
  return {id:text(input.id,100),owner:actor,year:input.year,title:text(input.title,120),visibility:'private',revision:0,moments:[]};
 }
 function capture(book,actor,input,expectedRevision){
  check(book,actor,expectedRevision);exact(input,['id','happenedOn','text']);
  const id=text(input.id,100);if(book.moments.some(m=>m.id===id))throw Error('This moment is already in the draft.');
  const month=date(input.happenedOn,book.year),note=text(input.text,10000),next=copy(book);
  next.moments.push({id,happenedOn:input.happenedOn,month,text:note,author:actor,source:'user',revision:0});next.revision++;return next;
 }
 function edit(book,actor,input,expectedRevision){
  check(book,actor,expectedRevision);exact(input,['id','text']);
  const next=copy(book),moment=next.moments.find(m=>m.id===input.id);
  if(!moment||moment.author!==actor)throw Error('Choose your own draft moment.');
  moment.text=text(input.text,10000);moment.revision++;next.revision++;return next;
 }
 function chapters(book,actor){
  check(book,actor);return Array.from({length:12},(_,i)=>({month:i+1,moments:copy(book.moments.filter(m=>m.month===i+1))}));
 }
 const api=Object.freeze({create,capture,edit,chapters});
 if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.StorybookDrafts=api;
})(typeof globalThis==='undefined'?this:globalThis);
