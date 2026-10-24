'use strict';
// Presentation-only adapter; no automatic profile reads, writes or onboarding.
const AdventureProfileView=(()=>{
 function model(state){
  if(!state||typeof state!=='object')return {screen:'unavailable',message:'Preferences cannot be confirmed right now.',editable:false};
  switch(state.state){
   case 'signed_out':return {screen:'sign_in',message:'Sign in to view your adventure preferences.',editable:false};
   case 'returning':return {screen:'saved',message:'Your saved adventure preferences are available.',editable:true,revision:state.profile?.revision??null};
   case 'created':return {screen:'saved',message:'Your adventure preferences were saved.',editable:true,revision:state.revision};
   case 'updated':return {screen:'saved',message:'Your changes were saved.',editable:true,revision:state.revision};
   case 'revision_conflict':return {screen:'refresh',message:'Your preferences changed elsewhere. Reload before editing.',editable:false};
   default:return {screen:'unavailable',message:'Preferences cannot be confirmed right now. No changes were made.',editable:false};
  }
 }
 return {model};
})();
if(typeof module!=='undefined')module.exports=AdventureProfileView;
