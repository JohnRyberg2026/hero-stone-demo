'use strict';
// Pure, fail-closed recommendation gate. Inputs must be server-authorized snapshots;
// this module never reads private profiles or performs external actions.
const RecommendationSafety = (() => {
 function evaluate(candidate, participants) {
  if (!Array.isArray(participants) || !participants.length || !candidate || typeof candidate !== 'object')
   return {eligible:false,reason:'needs_confirmation'};
  if (participants.some(p=>!p || p.loaded!==true || p.boundariesVerified!==true))
   return {eligible:false,reason:'needs_confirmation'};
  if (participants.some(p=>p.accepted!==true))
   return {eligible:false,reason:'needs_consent'};
  if (participants.some(p=>{
   const b=p.boundaries||{};
   if (b.minimalWalking===true && candidate.walkingLevel!=='minimal') return true;
   if (Array.isArray(b.avoidCategories) && b.avoidCategories.includes(candidate.category)) return true;
   if (typeof b.maxBudget==='number' && (!Number.isFinite(candidate.cost) || candidate.cost>b.maxBudget)) return true;
   return false;
  })) return {eligible:false,reason:'not_suitable'};
  if (candidate.accessibilityVerified!==true)
   return {eligible:false,reason:'needs_confirmation'};
  return {eligible:true,reason:'suitable'};
 }
 function rank(candidates,participants,wishes=[]) {
  const interest=new Set(wishes.filter(w=>w && w.permitted===true).map(w=>w.category));
  return candidates.filter(c=>evaluate(c,participants).eligible)
   .map((c,i)=>({candidate:c,score:interest.has(c.category)?1:0,index:i}))
   .sort((a,b)=>b.score-a.score||a.index-b.index).map(x=>x.candidate);
 }
 return {evaluate,rank};
})();
if(typeof module!=='undefined')module.exports=RecommendationSafety;
