(function(){
 'use strict';
 const $=id=>document.getElementById(id);let actor='fictional-preview-owner';
 const months=Array.from({length:12},(_,i)=>new Intl.DateTimeFormat('en',{month:'long',timeZone:'UTC'}).format(new Date(Date.UTC(2026,i,1))));
 let book=null,month=1,editing=null,dirty=false;
 $('bookYear').value=String(new Date().getFullYear());
 function clearSetup(){ $('bookTitle').value='My Living Story Book';$('bookYear').value=String(new Date().getFullYear());$('chapterTitle').textContent=''; }
 function say(message){$('feedback').textContent=message;}
 function discardEdits(){return !dirty||confirm('Discard these unfinished edits?');}
 function closeEditor(){editing=null;dirty=false;$('momentEditor').hidden=true;$('momentText').value='';$('momentDate').value='';$('momentDate').disabled=false;}
 function render(){
  $('volumeTitle').textContent=book.title+' · '+book.year;$('chapters').replaceChildren();
  for(let i=1;i<=12;i++){const b=document.createElement('button');b.type='button';b.textContent=months[i-1];b.setAttribute('aria-pressed',String(month===i));b.onclick=()=>{if(!discardEdits())return;closeEditor();month=i;render();$('chapterTitle').focus();};$('chapters').append(b);}
  $('chapterTitle').textContent=months[month-1]+' · '+book.year;$('moments').replaceChildren();
  const moments=StorybookDrafts.chapters(book,actor)[month-1].moments;
  if(!moments.length){const p=document.createElement('p');p.textContent='This chapter is waiting for your own moments.';$('moments').append(p);}
  for(const moment of moments){const card=document.createElement('article'),date=document.createElement('h4'),text=document.createElement('p'),edit=document.createElement('button');date.textContent=moment.happenedOn;text.textContent=moment.text;edit.textContent='Edit this moment';edit.type='button';edit.onclick=()=>openEditor(moment);card.append(date,text,edit);$('moments').append(card);}
 }
 function openEditor(moment){if(!discardEdits())return;editing=moment?.id||null;$('momentDate').value=moment?.happenedOn||'';$('momentDate').min=book.year+'-01-01';$('momentDate').max=book.year+'-12-31';$('momentDate').disabled=!!moment;$('momentText').value=moment?.text||'';$('editorTitle').textContent=moment?'Edit your words':'Capture a moment';$('momentEditor').hidden=false;dirty=false;$('editorTitle').focus();}
 $('bookForm').onsubmit=event=>{event.preventDefault();try{book=StorybookDrafts.create(actor,{id:crypto.randomUUID(),year:Number($('bookYear').value),title:$('bookTitle').value});month=1;$('bookSetup').hidden=true;$('bookContent').hidden=false;render();window.dispatchEvent(new Event('storybook:changed'));say('Annual preview opened. Nothing has been saved.');}catch(e){say(e.message);}};
 $('newMoment').onclick=()=>openEditor(null);
 ['momentDate','momentText'].forEach(id=>$(id).oninput=()=>{dirty=true;});
 $('momentForm').onsubmit=event=>{event.preventDefault();try{const date=$('momentDate').value;book=editing?StorybookDrafts.edit(book,actor,{id:editing,text:$('momentText').value},book.revision):StorybookDrafts.capture(book,actor,{id:crypto.randomUUID(),happenedOn:date,text:$('momentText').value},book.revision);month=Number(date.slice(5,7));closeEditor();render();window.dispatchEvent(new Event('storybook:changed'));say('Moment kept only in this open preview. Nothing uploaded or shared.');$('chapterTitle').focus();}catch(e){say(e.message);}};
 $('cancelMoment').onclick=()=>{if(!discardEdits())return;closeEditor();$('newMoment').focus();say('Edits canceled. Existing preview moments are unchanged.');};
 $('resetBook').onclick=()=>{if(!confirm('Discard this entire unsaved preview and all its moments?'))return;book=null;clearSetup();closeEditor();$('bookContent').hidden=true;$('bookSetup').hidden=false;$('moments').replaceChildren();$('chapters').replaceChildren();$('volumeTitle').textContent='';window.dispatchEvent(new Event('storybook:changed'));say('Preview discarded.');};
 window.StorybookPreview=Object.freeze({snapshot:()=>book?JSON.parse(JSON.stringify(book)):null,unfinished:()=>dirty,replace:next=>{book=JSON.parse(JSON.stringify(next));actor=book.owner;month=1;closeEditor();$('bookSetup').hidden=true;$('bookContent').hidden=false;render();},clear:()=>{book=null;actor='fictional-preview-owner';clearSetup();closeEditor();$('bookContent').hidden=true;$('bookSetup').hidden=false;$('moments').replaceChildren();$('chapters').replaceChildren();$('volumeTitle').textContent='';say('Account changed. Private preview cleared.');}});
 window.addEventListener('beforeunload',event=>{if(dirty||book?.moments.length){event.preventDefault();event.returnValue='';}});
})();
