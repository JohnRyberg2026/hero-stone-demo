/* Pure contract candidate, not authorization. A future server must authenticate
   actors, derive fingerprints/rosters/viewers from authorized sources, serialize
   changes and enforce this contract at the content/publication/export boundary.
   Browser objects and legacy shared flags never establish permission. */
(function(root){
 'use strict';
 const actions=['include','publish','export'];
 const copy=v=>JSON.parse(JSON.stringify(v));
 const check=(ok,message)=>{if(!ok)throw Error(message);};
 function ids(value){check(Array.isArray(value)&&value.length>0&&value.length<=100&&value.every(v=>typeof v==='string'&&v.trim()===v&&v.length>0&&v.length<=100)&&new Set(value).size===value.length,'Invalid identity roster');return [...value].sort();}
 function proposal(raw){
  check(raw&&typeof raw.bookId==='string'&&raw.bookId.trim()&&raw.bookId.length<=100,'Book required');check(Number.isSafeInteger(raw.revision)&&raw.revision>0,'Version required');
  check(typeof raw.contentFingerprint==='string'&&/^[a-f0-9]{64}$/.test(raw.contentFingerprint),'Server content fingerprint required');
  check(actions.includes(raw.action),'Choose an explicit action');
  const participants=ids(raw.participants),viewers=ids(raw.viewers);
  check(typeof raw.destination==='string'&&raw.destination.trim()&&raw.destination.length<=300,'Exact destination required');
  return {bookId:raw.bookId,revision:raw.revision,contentFingerprint:raw.contentFingerprint,participants,viewers,action:raw.action,destination:raw.destination};
 }
 const key=p=>JSON.stringify(proposal(p));
 function create(raw){return {proposal:proposal(raw),responses:[]};}
 function revise(state,raw,expectedRevision){
  check(state.proposal.revision===expectedRevision,'Review the current version');const next=proposal(raw);check(next.bookId===state.proposal.bookId&&next.revision===expectedRevision+1,'New version required');
  return create(next); // Old responses never carry into the new version.
 }
 function respond(state,{actor,decision,reviewedProposal},expectedRevision){
  check(state.proposal.revision===expectedRevision,'Review the current version');check(state.proposal.participants.includes(actor),'Only a required participant may answer');
  check(key(reviewedProposal)===key(state.proposal),'The content, audience or action changed');check(['approved','declined','withdrawn'].includes(decision),'Explicit response required');
  const previous=state.responses.find(r=>r.actor===actor);check(decision!=='withdrawn'||previous?.decision==='approved','Only an approval can be withdrawn');
  const next=copy(state);next.responses=next.responses.filter(r=>r.actor!==actor);next.responses.push({actor,decision,proposalKey:key(state.proposal)});return next;
 }
 function readiness(state,current,eligibility){
  // Eligibility is a current server-derived check, never profile age metadata.
  if(!eligibility||state.proposal.participants.some(id=>eligibility[id]!==true))return {ready:false,reason:'eligibility_unverified'};
  try{if(key(state.proposal)!==key(current))return {ready:false,reason:'version_changed'};}catch{return {ready:false,reason:'version_changed'};}
  const bound=key(current),responses=state.responses;
  if(!Array.isArray(responses)||new Set(responses.map(r=>r.actor)).size!==responses.length||responses.some(r=>!state.proposal.participants.includes(r.actor)||r.proposalKey!==bound))return {ready:false,reason:'invalid_responses'};
  if(state.proposal.participants.some(id=>!responses.some(r=>r.actor===id&&r.decision==='approved')))return {ready:false,reason:'approval_required'};
  return {ready:true,action:current.action};
 }
 const api=Object.freeze({create,revise,respond,readiness});if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.StorybookSharedConsent=api;
})(typeof globalThis==='undefined'?this:globalThis);
