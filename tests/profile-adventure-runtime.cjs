const assert=require('node:assert/strict');
const runtime=require('../profile-adventure-runtime.js');
const candidates=[
  {title:'Books',tags:['Bookstores'],minutes:45,free:true,walking:false},
  {title:'Nature walk',tags:['Nature'],minutes:90,free:true,walking:true},
  {title:'Restaurant',tags:['Restaurants'],minutes:60,free:false,walking:false},
  {title:'Unknown price',tags:['Nature'],minutes:45,walking:false},
  {title:'Unknown duration',tags:['Nature'],minutes:null,free:true,walking:false}
];
const today={maxMinutes:120,walking:false,freeOnly:false};
const profile={interests:['Nature','Food discoveries'],budget_style:'Free experiences'};
let result=runtime.plan(profile,candidates,{},today);
assert.deepEqual(result.ordered.map(a=>a.title),['Nature walk','Books']);
assert.equal(result.savedFreeOnly,true);
// An explicit current answer beats a broad saved interest.
result=runtime.plan(profile,candidates,{Nature:'dislike',Bookstores:'like'},today);
assert.deepEqual(result.liked,['Restaurants','Bookstores']);
assert.equal(result.ordered[0].title,'Books');
// Stronger limits cannot be weakened to fill three suggestion cards.
result=runtime.plan(profile,candidates,{}, {...today,walking:true,maxMinutes:30});
assert.deepEqual(result.ordered,[]);
// Each written requirement is a stop, not an inferred permission or verified match.
for(const key of ['avoid','food_needs','budget_notes','travel','transport','accessibility','physical_comfort_notes','hard_nos','ask_first','adventure_notes','surprise_notes','privacy_notes']){
  result=runtime.plan({...profile,[key]:'Private requirement'},candidates,{},today);
  assert.equal(result.review.length,1);assert.deepEqual(result.ordered,[]);
  assert(!JSON.stringify(result).includes('Private requirement'));
}
// Missing and skipped information remains unknown; unrelated keys are excluded.
const decoded=runtime.decode([
 {question_key:'account_profile_v1_interests',answer_json:{value:['Bookstores']},skipped:true},
 {question_key:'first_journey_interest_nature',answer_json:{value:['Nature']}},
 {question_key:'accountXprofileXv1_avoid',answer_json:{value:'Wrong namespace'}}
]);
assert.deepEqual(decoded,{interests:null});
assert.deepEqual(runtime.plan(decoded,candidates,{},today).liked,[]);
assert.equal(runtime.plan({},candidates,{},today).savedFreeOnly,false);
assert.deepEqual(runtime.interests({interests:['Nature']},{Nature:'unsure'}),[]);
assert.deepEqual(runtime.interests({interests:['Nature']},{Nature:'skip'}),[]);
console.log('PASS: saved-interest ordering, explicit overrides, free-only constraints, strict time/walking limits, unknowns, and every written-requirement gate.');
