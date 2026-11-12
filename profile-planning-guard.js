(function(root){
  'use strict';
  // Read fresh owner-only requirements for each planning action. Never return answers or reasons.
  function create(client,runtime,context){
    return async function check(){
      const initial=context();let owner;
      try{
        if(!initial || !runtime || typeof runtime.needsReview!=='function' || typeof runtime.decode!=='function')return {allowed:false,code:'unavailable'};
        const auth=await client.auth.getUser();owner=auth.data?.user?.id;
        if(auth.error||!owner)return {allowed:false,code:'signed_out'};
        if(context()!==initial)return {allowed:false,code:'changed'};
        const result=await client.from('user_onboarding_answers').select('question_key,answer_json,skipped').eq('user_id',owner).like('question_key','account_profile_v1_%');
        if(result.error || !Array.isArray(result.data))return {allowed:false,code:'unavailable'};
        const review=runtime.needsReview(runtime.decode(result.data));
        const active=await client.auth.getUser();
        if(active.error || active.data?.user?.id!==owner || context()!==initial)return {allowed:false,code:'changed'};
        return review.length?{allowed:false,code:'requirements'}:{allowed:true,code:'ready'};
      }catch(e){return {allowed:false,code:'unavailable'};}
    };
  }
  const api={create};if(typeof module==='object'&&module.exports)module.exports=api;else root.HeartStonePlanningGuard=api;
})(typeof globalThis==='object'?globalThis:this);
