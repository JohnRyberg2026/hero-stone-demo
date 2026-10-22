(function(){
 'use strict';
 const $=id=>document.getElementById(id),model=window.SharedDateModel;
 const people=[{id:'demo-you',name:'You (organizer)'},{id:'demo-alex',name:'Alex'},{id:'demo-sam',name:'Sam'},{id:'demo-jordan',name:'Jordan'}];
 let date=null;
 const names=ids=>ids.map(id=>people.find(p=>p.id===id).name).join(', ');
 for(const p of people){const label=document.createElement('label'),input=document.createElement('input');input.type='checkbox';input.value=p.id;input.checked=p.id==='demo-you'||p.id==='demo-alex';input.disabled=p.id==='demo-you';label.append(input,document.createTextNode(' '+p.name));$('participants').append(label);}
 function fields(){return {participants:[...$('participants').querySelectorAll('input')].filter(x=>x.checked).map(x=>x.value),title:$('sharedTitle').value,when:$('sharedWhen').value,meeting:$('sharedMeeting').value};}
 function act(fn){try{fn();$('sharedFeedback').textContent='';render();}catch(e){$('sharedFeedback').textContent=e.message;}}
 function render(){
  $('reviewSharedDate').hidden=!!date;$('reviseSharedDate').hidden=!date;
  $('sharedReview').hidden=!date;$('sharedResponses').hidden=!date||date.state==='draft';
  if(!date)return;
  $('sharedRevision').textContent='Invitation round '+date.revision+' · '+date.participants.length+' people';
  $('sharedReviewTitle').textContent=date.title;$('sharedReviewWhen').textContent='When: '+date.when;$('sharedReviewMeeting').textContent='Meeting: '+date.meeting;
  $('sharedRoster').textContent='Included in this round: '+names(date.participants.map(p=>p.id));
  $('simulateSharedSend').hidden=date.state!=='draft';
  const labels={draft:'Review before sending.',pending:'Waiting for each person’s answer.',confirmed:'Everyone included has accepted this version.',closed:'This invitation round is closed.',needs_revision:'Another time was requested. Create a revised invitation.',started:'This shared date has begun in the rehearsal.',stopped:'A participant stopped this shared date. Everyone’s participation is paused.'};
  $('sharedState').textContent=labels[date.state];
  $('sharedResponseRows').replaceChildren();
  for(const p of date.participants){const row=document.createElement('tr');for(const value of [names([p.id]),({pending:'Waiting',accepted:'Accepted',declined:'Declined',reschedule:'Requested another time',withdrawn:'Withdrew acceptance'})[p.response]]){const cell=document.createElement('td');cell.textContent=value;row.append(cell);}$('sharedResponseRows').append(row);}
  const selected=$('sharedActor').value;
  $('sharedActor').replaceChildren(...date.participants.map(p=>{const o=document.createElement('option');o.value=p.id;o.textContent=names([p.id]);return o;}));
  $('sharedActor').value=date.participants.some(p=>p.id===selected)?selected:date.participants.find(p=>p.response==='pending')?.id||'demo-you';
  $('sharedResponseControls').hidden=!['pending','confirmed','started'].includes(date.state);
  $('simulateSharedStop').hidden=date.state!=='started';
  $('simulateSharedBegin').disabled=date.state!=='confirmed';
  updateButtons();
 }
 function updateButtons(){if(!date)return;const p=date.participants.find(p=>p.id===$('sharedActor').value);document.querySelectorAll('[data-response]').forEach(b=>{b.disabled=!['pending','confirmed'].includes(date.state)||(b.dataset.response==='withdrawn'?p?.response!=='accepted':p?.response!=='pending');});}
 $('sharedActor').onchange=updateButtons;
 $('reviewSharedDate').onclick=()=>act(()=>{date=model.create({id:'local-rehearsal',organizer:'demo-you',...fields()});});
 $('reviseSharedDate').onclick=()=>act(()=>{date=model.revise(date,'demo-you',fields(),date.revision);});
 $('simulateSharedSend').onclick=()=>act(()=>{date=model.send(date,'demo-you',date.revision);$('sharedActor').value=date.participants.find(p=>p.response==='pending')?.id||'demo-you';});
 document.querySelectorAll('[data-response]').forEach(b=>b.onclick=()=>act(()=>{date=model.respond(date,$('sharedActor').value,b.dataset.response,date.revision);}));
 $('simulateSharedBegin').onclick=()=>act(()=>{date=model.begin(date,'demo-you',date.revision);});
 $('simulateSharedStop').onclick=()=>act(()=>{date=model.stop(date,$('sharedActor').value,date.revision);});
 $('resetSharedPreview').onclick=()=>{date=null;$('sharedFeedback').textContent='Rehearsal cleared.';render();};
 render();
})();
