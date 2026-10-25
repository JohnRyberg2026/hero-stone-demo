/* Personal draft review only. Not venue verification, participant consent,
   shared-profile retrieval, ranking, invitation approval or spending authority. */
(function(root){
 'use strict';
 const Store=typeof module!=='undefined'&&module.exports?require('./adventure-preferences-store.js'):AdventurePreferencesStore;
 function review({accountId,profile,plan,catalog}={}){
  if(!accountId||!profile?.ready||profile.profile?.ownerId!==accountId||!Number.isSafeInteger(profile.profile.revision)||profile.profile.revision<0||!Store.valid(profile.boundaries)||!Array.isArray(plan?.stops)||!Array.isArray(catalog))return {status:'unavailable',findings:[]};
  if(!plan.stops.length)return {status:'empty',findings:[]};
  const findings=[],b=profile.boundaries;let conflict=false,assigned=0,unknownAmount=false;
  plan.stops.forEach((stop,index)=>{
   const item=catalog.find(c=>c.id===stop.catalogId),messages=[];let blocked=false;
   if((b.avoidCategories||[]).includes(stop.category)||(item?.hazards||[]).some(h=>(b.avoidCategories||[]).includes(h))){blocked=true;messages.push('This choice overlaps a saved category to avoid.');}
   if(b.minimalWalking===true&&!(item?.accessibilityVerified===true&&item?.walkingLevel==='minimal'))messages.push('Minimal walking has not been verified for this choice. Confirm the route, distance and access before deciding.');
   // Descriptive effort labels and a manually checked stop are not verification.
   if(item?.accessibilityVerified!==true)messages.push('Current practical and accessibility details still need confirmation.');
   if(stop.amount===''||!Number.isFinite(Number(stop.amount)))unknownAmount=true;else assigned+=Number(stop.amount);
   conflict=conflict||blocked;findings.push({index:index+1,conflict:blocked,messages});
  });
  let budget='Amounts in this draft are allowances, not final provider quotes; fees and travel still need checking.';
  if(typeof b.maxBudget==='number'&&assigned>b.maxBudget){conflict=true;budget='The amounts assigned across this draft exceed your saved personal spending limit. Confirm who pays; no cost split is assumed.';}
  else if(unknownAmount)budget='Some amounts remain undecided. The total cost cannot be confirmed.';
  return {status:conflict?'conflicts':'needs_confirmation',profileRevision:profile.profile.revision,findings,budget};
 }
 if(typeof module!=='undefined'&&module.exports)module.exports={review};else root.PrivatePlanReview={review};
})(typeof globalThis==='undefined'?this:globalThis);
