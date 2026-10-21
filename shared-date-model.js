/* Pure participant workflow. Inputs in a live service must come from authenticated,
   server-authorized accounts. Browser objects never establish identity or age. */
(function(root){
 'use strict';
 const copy=x=>JSON.parse(JSON.stringify(x));
 function check(ok,message){if(!ok)throw Error(message);}
 function roster(ids,organizer){
  check(Array.isArray(ids)&&ids.length>=2&&ids.length<=20,'Choose between 2 and 20 participants, including yourself.');
  check(ids.every(id=>typeof id==='string'&&id.trim()===id&&id.length>0&&id.length<=100),'Each participant needs an account identity.');
  check(new Set(ids).size===ids.length,'Each person can appear only once.');
  check(ids.includes(organizer),'The organizer must be included.');
 }
 function create({id,organizer,participants,title,when,meeting}){
  roster(participants,organizer);
  check(typeof id==='string'&&id.length>0,'A date identity is required.');
  check(typeof title==='string'&&title.trim().length>0&&title.length<=120,'Give this date a name of up to 120 characters.');
  check(typeof when==='string'&&when.trim().length>0&&when.length<=300,'Include a time or say you will decide together.');
  check(typeof meeting==='string'&&meeting.trim().length>0&&meeting.length<=500,'Include a meeting place or say you will decide together.');
  return {id,organizer,revision:1,title:title.trim(),when:when.trim(),meeting:meeting.trim(),state:'draft',participants:participants.map(id=>({id,response:'pending'}))};
 }
 function member(date,actor){const p=date.participants.find(p=>p.id===actor);check(p,'Only an included participant can access this date.');return p;}
 function expected(date,revision){check(revision===date.revision,'This date changed. Review the current invitation.');}
 function send(date,actor,revision){
  member(date,actor);expected(date,revision);check(actor===date.organizer,'Only the organizer can send this draft.');check(date.state==='draft','This invitation round is already sent or closed.');
  const next=copy(date);next.state='pending';next.participants.find(p=>p.id===actor).response='accepted';return next;
 }
 function respond(date,actor,response,revision){
  member(date,actor);expected(date,revision);check(['accepted','declined','reschedule','withdrawn'].includes(response),'Choose your own response.');
  check(['pending','confirmed'].includes(date.state),'This invitation round is closed.');
  check(response!=='withdrawn'||date.participants.find(p=>p.id===actor).response==='accepted','Only an accepted participant can withdraw.');
  const next=copy(date),p=next.participants.find(p=>p.id===actor);
  check(!(p.response==='accepted'&&response!=='withdrawn'),'Withdraw your acceptance before changing your response.');
  p.response=response;
  next.state=response==='declined'||response==='withdrawn'?'closed':response==='reschedule'?'needs_revision':next.participants.every(p=>p.response==='accepted')?'confirmed':'pending';
  return next;
 }
 function revise(date,actor,{participants,title,when,meeting},revision){
  member(date,actor);expected(date,revision);check(actor===date.organizer,'Only the organizer can revise this date.');
  check(date.state!=='started','An underway date cannot be replaced. Create another date.');
  const next=create({id:date.id,organizer:date.organizer,participants,title,when,meeting});next.revision=date.revision+1;return next;
 }
 function begin(date,actor,revision){
  member(date,actor);expected(date,revision);check(date.state==='confirmed'&&date.participants.every(p=>p.response==='accepted'),'Every included participant must accept this version before it can begin.');
  const next=copy(date);next.state='started';return next;
 }
 function stop(date,actor,revision){member(date,actor);expected(date,revision);check(date.state==='started','Only an underway date can be stopped.');const next=copy(date);next.state='stopped';next.stoppedBy=actor;return next;}
 function view(date,actor){member(date,actor);return copy(date);}
 const api=Object.freeze({create,send,respond,revise,begin,stop,view});
 if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.SharedDateModel=api;
})(typeof window==='undefined'?globalThis:window);
