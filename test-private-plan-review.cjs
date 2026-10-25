const assert=require('node:assert/strict'),{review}=require('./private-plan-review.js');
const profile={ready:true,profile:{ownerId:'A',revision:3},boundaries:{minimalWalking:true,maxBudget:20,avoidCategories:['water']}};
const plan={stops:[{catalogId:'one',category:'outdoors',amount:'30',confirmed:true}]},catalog=[{id:'one',effort:'seated',hazards:['water']}];
const result=review({accountId:'A',profile,plan,catalog});assert.equal(result.status,'conflicts');assert(result.findings[0].conflict);assert(result.findings[0].messages.some(x=>x.includes('not been verified')));assert(result.budget.includes('exceed'));assert(!JSON.stringify(result).includes('maxBudget'));assert(!JSON.stringify(result).includes('water'));
assert.equal(review({accountId:'B',profile,plan,catalog}).status,'unavailable');assert.equal(review({accountId:'A',profile:{ready:false},plan,catalog}).status,'unavailable');
const unknown=review({accountId:'A',profile:{...profile,boundaries:{minimalWalking:true}},plan:{stops:[{category:'meals',amount:''}]},catalog:[]});assert.equal(unknown.status,'needs_confirmation');assert(unknown.budget.includes('undecided'));
assert.equal(review({accountId:'A',profile,plan:{stops:[]},catalog}).status,'empty');
console.log('PASS: account-bound private plan review, explicit conflicts, unknown access/costs, no effort-label verification or participant consent, no raw boundary disclosure.');
