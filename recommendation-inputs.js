'use strict';
// Account-scoped, revision-aware input adapter. Caller must supply authenticated,
// authorized snapshots. Never fall back to device or cached data after failed load.
const RecommendationInputs=(()=>{
 function build({accountId,profile,participants,wishes=[]}={}){
  if(typeof accountId!=='string'||!accountId||!profile||profile.ownerId!==accountId||profile.loaded!==true||!Number.isSafeInteger(profile.revision)||profile.revision<0)
   return {ready:false,reason:'needs_confirmation',participants:[],wishes:[]};
  if(!Array.isArray(participants)||!participants.length||participants.some(p=>!p||p.authorized!==true||p.loaded!==true||p.boundariesVerified!==true||p.accepted!==true))
   return {ready:false,reason:'needs_confirmation',participants:[],wishes:[]};
  const safe=participants.map(p=>({loaded:true,boundariesVerified:true,accepted:true,boundaries:{
   minimalWalking:p.boundaries?.minimalWalking===true,
   avoidCategories:Array.isArray(p.boundaries?.avoidCategories)?p.boundaries.avoidCategories.filter(x=>typeof x==='string'):[],
   ...(typeof p.boundaries?.maxBudget==='number'&&Number.isFinite(p.boundaries.maxBudget)?{maxBudget:p.boundaries.maxBudget}:{})
  }}));
  const interests=wishes.filter(w=>w&&w.ownerId===accountId&&w.authorized===true&&w.permitted===true&&typeof w.category==='string'&&w.preference!=='dream').map(w=>({category:w.category,permitted:true}));
  return {ready:true,revision:profile.revision,participants:safe,wishes:interests};
 }
 return {build};
})();
if(typeof module!=='undefined')module.exports=RecommendationInputs;
