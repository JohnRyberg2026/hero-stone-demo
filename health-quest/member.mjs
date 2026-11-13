import { privateRecords } from './private-records.mjs';

export async function mountMember(doc, client, { uuid = () => crypto.randomUUID(), download } = {}) {
  const q = id => doc.getElementById(id);
  let owner=null, store=null, rows=[], editing=null, pending=null, generation=0, busy=false;
  function status(message){q('status').textContent=message;}
  function lock(value){busy=value;q('workspace').querySelectorAll('button,input,select,textarea').forEach(b=>b.disabled=value);q('kind').disabled=value||!!editing;}
  function draft(){editing=null;pending=null;q('editor').reset();q('kind').disabled=false;q('editor').hidden=false;q('review').hidden=true;q('review-text').textContent='';q('review-details').textContent='';q('editor-title').textContent='What would you like to remember?';}
  function clear(){generation++;owner=null;store=null;rows=[];draft();q('records').replaceChildren();q('workspace').hidden=true;lock(false);}
  function render(){
    q('records').replaceChildren();
    if(!rows.length){q('records').textContent='No saved notes yet. Start with whatever matters to you.';return;}
    for(const row of rows){
      const article=doc.createElement('article'),meta=doc.createElement('p'),text=doc.createElement('p');
      meta.className='tag';meta.textContent=`${row.kind==='goal'?'Goal':'Observation'} · ${row.state} · Follow-up ${row.followup?'allowed':'off'}`;
      text.textContent=row.text;article.append(meta,text);
      const edit=doc.createElement('button');edit.type='button';edit.textContent='Correct this note';
      edit.onclick=()=>{draft();editing=row;q('kind').value=row.kind;q('kind').disabled=true;q('text').value=row.text;q('state').value=row.state;q('followup').checked=row.followup;q('editor-title').textContent='Correct your note';q('text').focus();};article.append(edit);
      const remove=doc.createElement('button');remove.type='button';remove.textContent='Delete this note';
      remove.onclick=()=>review({...row,text:row.text,id:row.id,kind:row.kind,revision:row.revision,state:'deleted',followup:false,occurredAt:row.occurred_at});article.append(remove);
      if(row.followup){const stop=doc.createElement('button');stop.type='button';stop.textContent='Stop follow-up';stop.onclick=()=>review({...row,id:row.id,kind:row.kind,revision:row.revision,state:row.state,followup:false,occurredAt:row.occurred_at});article.append(stop);}
      q('records').append(article);
    }
  }
  function review(input){
    pending={...input,actionId:uuid(),approved:true};q('editor').hidden=true;q('review').hidden=false;
    q('review-text').textContent=input.text;
    q('review-details').textContent=input.state==='deleted'?'Delete this note? Its saved text will be cleared. Provider backups may retain earlier data.':`${input.kind==='goal'?'Goal':'Observation'} · ${input.state} · Follow-up ${input.followup?'allowed':'off'}`;
    q('confirm').textContent=input.state==='deleted'?'Delete this note':'Save this privately';q('confirm').focus();
  }
  async function load(){
    if(busy)return;const token=++generation;lock(true);status('Loading your private notes…');
    try{
      const auth=await client.auth.getUser();if(token!==generation)return;
      if(auth.error||!auth.data?.user)throw Error('Sign in on the Heartstone home page, then return here.');
      const id=auth.data.user.id, candidate=privateRecords(client,id),data=await candidate.list();
      if(token!==generation)return;owner=id;store=candidate;rows=data;draft();render();q('workspace').hidden=false;status('Your private notes are ready.');
    }catch(e){if(token===generation){clear();status(e.message);}}
    finally{if(token===generation)lock(false);}
  }
  q('editor').onsubmit=e=>{e.preventDefault();if(busy)return;const text=q('text').value.trim();if(!text){status('Add a few words before reviewing.');return;}
    review({id:editing?.id||uuid(),kind:q('kind').value,text,state:q('state').value,followup:q('followup').checked,revision:editing?.revision||0,occurredAt:editing?.occurred_at||null});};
  q('confirm').onclick=async()=>{
    if(busy||!pending||!store)return;const token=generation,input=pending,storage=store;lock(true);status('Saving your note…');
    try{const row=await storage.save(input);if(token!==generation)return;rows=rows.filter(r=>r.id!==row.id);if(row.state!=='deleted')rows.push(row);draft();render();status(row.state==='deleted'?'Note deleted.':'Saved privately.');}
    catch(e){if(token===generation){if(e.message.startsWith('Account changed'))clear();status(e.message);}}
    finally{if(token===generation)lock(false);}
  };
  q('cancel').onclick=draft;q('back').onclick=()=>{pending=null;q('review').hidden=true;q('editor').hidden=false;};
  q('refresh').onclick=load;
  q('export').onclick=async()=>{
    if(busy||!store)return;const token=generation;lock(true);
    try{const data=await store.list();if(token!==generation)return;const content=JSON.stringify({records:data},null,2);
      if(download)download(content);else{const url=URL.createObjectURL(new Blob([content],{type:'application/json'}));const a=doc.createElement('a');a.href=url;a.download='health-quest-notes.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}status('Your notes were exported. Keep the downloaded file private.');
    }catch(e){if(token===generation){if(e.message.startsWith('Account changed'))clear();status(e.message);}}finally{if(token===generation)lock(false);}
  };
  const {data:subscription}=client.auth.onAuthStateChange((event,session)=>{
    if(event==='SIGNED_OUT'||(owner&&session?.user?.id!==owner)){clear();status('Your account changed. Return to Heartstone to sign in.');}
  });
  doc.defaultView?.addEventListener('pagehide',clear);
  doc.defaultView?.addEventListener('pageshow',e=>{if(e.persisted)load();});
  await load();
  return { reload:load, destroy(){clear();subscription?.subscription?.unsubscribe();} };
}
