(function(root){
  'use strict';
  const prefix='account_profile_v1_';
  const interestTags={Nature:'Nature',Bookstores:'Bookstores','Local history':'Local history','Food discoveries':'Restaurants',Volunteering:'Volunteering','Road trips':'Road trips'};
  // Written requirements cannot be treated as satisfied by an unverified sample idea.
  const reviewFields={avoid:'Things to Avoid',food_needs:'Food & Dining requirements',budget_notes:'Spending limits',travel:'Travel limits',transport:'Transportation needs',accessibility:'Accessibility & Accommodations',physical_comfort_notes:'Physical comfort needs',hard_nos:'Hard No’s',ask_first:'Ask Me First',adventure_notes:'Exploration comfort',surprise_notes:'Surprise requirements',privacy_notes:'Privacy preferences'};
  function decode(rows){
    const values={};
    for(const row of rows||[]){
      if(!row.question_key?.startsWith(prefix))continue;
      const key=row.question_key.slice(prefix.length);
      if(row.skipped){values[key]=null;continue;}
      values[key]=row.answer_json?.value;
    }
    return values;
  }
  function needsReview(profile){
    return Object.entries(reviewFields).filter(([key])=>{
      const value=profile[key];
      return typeof value==='string'?value.trim().length>0:value!==null&&value!==undefined;
    }).map(([,label])=>label);
  }
  function interests(profile, currentLikes){
    const selected=Array.isArray(profile.interests)?profile.interests:[];
    const saved=selected.filter(x=>Object.hasOwn(interestTags,x)).map(x=>interestTags[x]);
    // Current explicit answers (including Not sure and Skip) override saved interests.
    const liked=saved.filter(tag=>!Object.hasOwn(currentLikes,tag));
    for(const [tag,value] of Object.entries(currentLikes))if(value==='like')liked.push(tag);
    return [...new Set(liked)];
  }
  function plan(profile,candidates,currentLikes,limits,learning={}){
    const review=needsReview(profile);
    if(review.length)return {review,liked:[],ordered:[],savedFreeOnly:false};
    const liked=interests(profile,currentLikes);
    const savedFreeOnly=profile.budget_style==='Free experiences';
    const eligible=candidates.filter(a=>!(limits.walking&&a.walking)&&!((limits.freeOnly||savedFreeOnly)&&a.free!==true)&&Number.isFinite(a.minutes)&&a.minutes<=limits.maxMinutes);
    const score=a=>a.tags.filter(tag=>liked.includes(tag)).length+(learning[candidates.indexOf(a)]==='more'?1:0)-(learning[candidates.indexOf(a)]==='less'?1:0);
    const ordered=[...eligible].sort((a,b)=>score(b)-score(a));
    return {review,liked,ordered,savedFreeOnly};
  }
  const api={decode,needsReview,interests,plan};
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.HeartStoneProfileRuntime=api;
})(typeof globalThis==='object'?globalThis:this);
