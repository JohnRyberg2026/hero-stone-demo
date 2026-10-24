'use strict';
// Explicit authenticated snapshot boundary. No persistent or browser storage fallback.
// Profile backend integration must supply these fields after fresh authorization.
const RecommendationProfileBoundary=(()=>{
 function accept({authenticatedUserId,profileResponse,participantResponses}={}){
  if(!authenticatedUserId||!profileResponse||profileResponse.error||profileResponse.ownerId!==authenticatedUserId||profileResponse.loaded!==true||!Number.isSafeInteger(profileResponse.revision))
   return {ready:false,reason:'needs_confirmation'};
  if(!Array.isArray(participantResponses)||!participantResponses.length||participantResponses.some(p=>!p||p.error||p.authorized!==true||p.loaded!==true||p.boundariesVerified!==true||p.accepted!==true))
   return {ready:false,reason:'needs_confirmation'};
  return {ready:true,accountId:authenticatedUserId,profile:{ownerId:authenticatedUserId,loaded:true,revision:profileResponse.revision},participants:participantResponses.map(p=>({authorized:true,loaded:true,boundariesVerified:true,accepted:true,boundaries:p.boundaries||{}}))};
 }
 return {accept};
})();
if(typeof module!=='undefined')module.exports=RecommendationProfileBoundary;
