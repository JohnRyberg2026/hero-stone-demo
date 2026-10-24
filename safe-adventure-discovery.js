'use strict';
// Development-only bridge for the existing local adventure catalog.
// Does not load profiles, read storage, invite participants or book anything.
const SafeAdventureDiscovery=(()=>{
 function recommend({enabled=false,accountId,profile,participants,wishes,catalog}={}){
  if(enabled!==true)return {status:'disabled',suggestions:[]};
  const inputs=RecommendationInputs.build({accountId,profile,participants,wishes});
  if(!inputs.ready)return {status:'needs_confirmation',suggestions:[]};
  if(!Array.isArray(catalog))return {status:'needs_confirmation',suggestions:[]};
  const candidates=catalog.filter(x=>x&&typeof x.id==='string'&&typeof x.category==='string').map(x=>({
   id:x.id,category:x.category,walkingLevel:x.walkingLevel,
   accessibilityVerified:x.accessibilityVerified===true,cost:x.cost
  }));
  const ranked=RecommendationSafety.rank(candidates,inputs.participants,inputs.wishes);
  return {status:ranked.length?'ready':'no_verified_matches',suggestions:ranked.map(x=>({id:x.id,category:x.category}))};
 }
 return {recommend};
})();
if(typeof module!=='undefined')module.exports=SafeAdventureDiscovery;
