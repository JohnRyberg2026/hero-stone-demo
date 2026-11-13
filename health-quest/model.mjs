// Hypothetical data only. Never used for live production or charging.
export const catalog = [
 {id:'powder',name:'Targeted Wellness sample powder',category:'Targeted Wellness',cents:400,size:'28 g',ingredients:'Illustrative Three Trees and Four Seeds base'},
 {id:'oil',name:'Moringa botanical oil — sample',category:'Skin & Hair Care',cents:1000,size:'1 oz',ingredients:'Sample moringa-infused carrier oil'},
 {id:'wash',name:'Moringa body wash — sample',category:'Bath & Body',cents:600,size:'4 oz',ingredients:'Sample moringa-infused glycerin and Castile soap'},
 {id:'oral',name:'Nature Smile — sample',category:'Oral Care',cents:500,size:'Sample container',ingredients:'Sample calcium carbonate, glycerin, coconut oil and moringa'},
 {id:'honey',name:'Moringa honey — sample',category:'Honey',cents:800,size:'4 oz',ingredients:'Sample honey and moringa'},
 {id:'gift',name:'Garden gift set — sample',category:'Gift Sets',cents:3500,size:'Sample set',ingredients:'Illustrative selection; contents not finalized'}
];
export const baseIngredients = [
 ['Moringa',1400],['Baobab',800],['Jabuticaba',600],['Flax',700],['Chia',700],['Hemp hearts',700],['Pumpkin',700]
];
export const sampleCosts = {perKgCents:[2000,3000,4000,600,800,1800,1200],bagCents:10,laborCents:500,overheadCents:200};
export function initialModel(){return {schema:1,request:'Support everyday energy, movement and general wellness.',budget:10000,versions:[],active:null,production:null,sharing:{formula:false,request:false},recommendations:[],cart:[],orders:[],events:[]};}
const copy = value => structuredClone(value);
function integer(value,min,max,name){if(!Number.isInteger(value)||value<min||value>max)throw Error(`Check ${name}.`);}
export function calculate(plan){
 integer(plan.days,1,90,'plan days');integer(plan.daily,1,3,'daily smoothies');
 if(!['standard','bundle'].includes(plan.pricing))throw Error('Choose sample pricing.');
 const mix=plan.ingredients??baseIngredients;
 if(!Array.isArray(mix)||mix.length!==baseIngredients.length)throw Error('Use the seven sample ingredients.');
 mix.forEach((entry,index)=>{if(!Array.isArray(entry)||entry[0]!==baseIngredients[index][0])throw Error('Unknown sample ingredient.');integer(entry[1],0,20000,'ingredient milligrams');});
 const servingMg=mix.reduce((sum,entry)=>sum+entry[1],0);
 if(servingMg<100||servingMg>50000)throw Error('Sample serving must be 0.1–50 g.');
 const servings=plan.days*plan.daily,totalMg=servings*servingMg,grams=totalMg/1000;
 const packages=Math.ceil(totalMg/28000);
 const costs=plan.costs??sampleCosts;
 if(!Array.isArray(costs.perKgCents)||costs.perKgCents.length!==mix.length)throw Error('Check ingredient prices.');
 costs.perKgCents.forEach(value=>integer(value,0,1000000,'sample cost per kilogram'));
 ['bagCents','laborCents','overheadCents'].forEach(field=>integer(costs[field],0,1000000,field));
 const weighted=mix.reduce((sum,entry,index)=>sum+BigInt(entry[1])*BigInt(costs.perKgCents[index]),0n);
 const divisor=BigInt(servingMg)*1000000n;
 const ingredientCost=Number((weighted*BigInt(packages*28000)+divisor/2n)/divisor);
 const packagingCost=packages*costs.bagCents;
 const productionCost=ingredientCost+packagingCost+costs.laborCents+costs.overheadCents;
 // Synthetic $120 baseline and $98 bundle for 90 servings. No hidden price override.
 const subtotal=Math.round(servings*12000/90),discount=plan.pricing==='bundle'?Math.round(servings*2200/90):0;
 return {costs:copy(costs),ingredientCost,packagingCost,productionCost,contribution:subtotal-discount-productionCost,servings,grams:grams,servingGrams:servingMg/1000,packages,leftover:(packages*28000-totalMg)/1000,subtotal,discount,total:subtotal-discount,
 ingredients:mix.map(([name,mg])=>({name,perServing:mg/1000,totalGrams:mg*servings/1000})),
 calendar:Array.from({length:plan.days},(_,i)=>({day:i+1,slots:['Morning foundation',['Gut theme','Flexible theme','Radiant theme'][i%3],'Evening foundation'].slice(0,plan.daily)}))};
}
export function propose(state, options={}){
 const next=copy(state),parent=next.versions.at(-1);
 const plan={id:next.versions.length+1,days:options.days??parent?.days??30,daily:options.daily??parent?.daily??3,pricing:options.pricing??parent?.pricing??'standard',source:options.source||'Member request',request:next.request,costs:copy(options.costs??parent?.costs??sampleCosts),ingredients:copy(options.ingredients??parent?.ingredients??baseIngredients)};
 calculate(plan);next.versions.push(plan);next.events.push(`Proposed version ${plan.id}; active plan unchanged.`);return next;
}

export function exclusionConflicts(state,plan){
 const avoided=state.exclusions||[];
 if(!Array.isArray(avoided)||avoided.some(name=>!baseIngredients.some(([ingredient])=>ingredient===name)))throw Error('Unknown excluded ingredient.');
 return (plan.ingredients??baseIngredients).filter(([name,mg])=>mg>0&&avoided.includes(name)).map(([name])=>name);
}
function requireNoExclusions(state,plan){const conflicts=exclusionConflicts(state,plan);if(conflicts.length)throw Error(`Revise the formula: excluded ingredients present — ${conflicts.join(', ')}.`);}

export function approve(state,id){
 const next=copy(state),plan=next.versions.find(v=>v.id===id);if(!plan)throw Error('Proposal missing.');
 if(id!==next.versions.at(-1)?.id)throw Error('Review the latest proposal first.');
 requireNoExclusions(state,plan);
 next.active=id;next.production=null;next.events.push(`Member approved version ${id}. Production review required.`);return next;
}
export function physicianView(state){
 if(!state.sharing.formula)return null;
 return {plan:copy(state.versions.at(-1)||null),request:state.sharing.request?state.request:null};
}
export function recommend(state,daily,options={}){
 if(!physicianView(state)?.plan)throw Error('Member must share a formula first.');
 integer(daily,1,3,'daily smoothies');const next=copy(state);
 const shared=physicianView(state).plan,ingredients=copy(options.ingredients??shared.ingredients??baseIngredients);
 calculate({...shared,daily,ingredients});
 const reason=options.reason??'Hypothetical schedule revision for workflow testing.';
 if(typeof reason!=='string'||!reason.trim()||reason.length>1000)throw Error('Add a reason of up to 1,000 characters.');
 next.recommendations.push({id:next.recommendations.length+1,version:physicianView(state).plan.id,daily,author:'Demo physician',date:new Date().toISOString(),status:'pending',reason:reason.trim(),ingredients});return next;
}
export function applyRecommendation(state,id,accept){
 const next=copy(state),rec=next.recommendations.find(r=>r.id===id);
 if(!rec||rec.status!=='pending')throw Error('Recommendation already resolved.');
 if(!accept){rec.status='declined';return next;}
 const latest=next.versions.at(-1);if(rec.version!==latest?.id)throw Error('Recommendation refers to an older version. Request a new review.');
 rec.status=accept?'accepted for recalculation':'declined';
 if(!accept)return next;
 return propose(next,{days:latest.days,daily:rec.daily,pricing:latest.pricing,ingredients:rec.ingredients??latest.ingredients,source:`${rec.author} recommendation ${rec.id}; member requested recalculation`});
}
export function productionReview(state){
 if(!state.active||state.active!==state.versions.at(-1)?.id)throw Error('Member must approve the latest proposal.');
 if(state.recommendations.some(r=>r.status==='pending'))throw Error('Resolve the pending recommendation first.');
 requireNoExclusions(state,state.versions.find(v=>v.id===state.active));
 const next=copy(state);next.production=state.active;next.events.push(`Demo manufacturer reviewed exact version ${state.active}.`);return next;
}
export function addToCart(state,id){
 const next=copy(state);
 if(id==='plan'){
  if(state.recommendations.some(r=>r.status==='pending')||!state.active||state.production!==state.active||state.active!==state.versions.at(-1)?.id)throw Error('Approve and review the latest plan first.');
  const plan=state.versions.find(v=>v.id===state.active),totals=calculate(plan);requireNoExclusions(state,plan);
  if(next.cart.some(item=>item.id==='plan'))throw Error('This sample plan is already in the cart.');
  next.cart.push({id:'plan',name:`Monthly sample plan · version ${plan.id}`,cents:totals.total,quantity:1,plan:copy(plan)});
 }else{
  const product=catalog.find(p=>p.id===id);if(!product)throw Error('Product unavailable.');
  const line=next.cart.find(item=>item.id===id);if(line){if(line.quantity>=20)throw Error('Sample quantity limit reached.');line.quantity++;}
  else next.cart.push({...copy(product),quantity:1});
 }return next;
}
export function quote(state,{fulfillment='pickup',payment='deferred',member=true}={}){
 if(!['pickup','delivery','shipping'].includes(fulfillment)||!['deferred','online'].includes(payment)||typeof member!=='boolean')throw Error('Choose fulfillment and payment.');
 if(fulfillment==='shipping'&&payment!=='online')throw Error('Shipping requires prepaid payment.');
 const subtotal=state.cart.reduce((n,item)=>n+item.cents*item.quantity,0);
 const fee=fulfillment==='shipping'?800:fulfillment==='delivery'&&!member?500:0;
 return {subtotal,fee,tax:0,total:subtotal+fee,fulfillment,payment,member};
}
export function checkout(state,options,key){
 if(!key)throw Error('Missing checkout reference.');
 const previous=state.orders.find(order=>order.key===key);if(previous)return copy(state);
 if(!state.cart.length)throw Error('Your sample cart is empty.');
 const plan=state.cart.find(item=>item.id==='plan');
 if(plan&&(state.recommendations.some(r=>r.status==='pending')||plan.plan.id!==state.active||state.production!==state.active||state.active!==state.versions.at(-1)?.id))throw Error('Plan changed. Remove it and add the newly approved version.');
 if(plan)requireNoExclusions(state,plan.plan);
 if(plan?.refill){const current=refillQuote(state);if(JSON.stringify(current)!==JSON.stringify(plan.refill))throw Error('Supply changed. Remove this refill and prepare a new proposal.');}
 const total=quote(state,options),next=copy(state);
 next.orders.push({id:`DEMO-${next.orders.length+1}`,key,items:copy(next.cart),...total,paymentStatus:total.payment==='online'?'Simulated paid':'Simulated payment due',status:'Simulated received',createdAt:new Date().toISOString()});next.cart=[];return next;
}

export function orderActions(order){
 const next={'Simulated received':'prepare','Simulated preparing':{pickup:'ready',delivery:'dispatch',shipping:'ship'}[order.fulfillment],'Simulated ready for pickup':'complete','Simulated out for delivery':'complete','Simulated shipped':'complete'}[order.status];
 const actions=[];
 if(order.paymentStatus==='Simulated payment due')actions.push('collect');
 if(next&&!(next==='complete'&&order.paymentStatus!=='Simulated paid'))actions.push(next);
 return actions;
}
export function updateOrder(state,id,action,actionId,expectedStatus){
 if(!actionId)throw Error('Missing order action reference.');
 const next=copy(state),order=next.orders.find(o=>o.id===id);if(!order)throw Error('Order missing.');
 const previous=(order.history||[]).find(event=>event.actionId===actionId);
 if(previous){if(previous.action!==action)throw Error('Order action reference reused.');return next;}
 if(order.status!==expectedStatus)throw Error('Order changed. Reload its current status.');
 if(!orderActions(order).includes(action))throw Error('This order action is not available.');
 const states={prepare:'Simulated preparing',ready:'Simulated ready for pickup',dispatch:'Simulated out for delivery',ship:'Simulated shipped',complete:'Simulated completed'};
 if(action==='collect')order.paymentStatus='Simulated paid';else order.status=states[action];
 order.history??=[];order.history.push({actionId,action,status:order.status,paymentStatus:order.paymentStatus,at:new Date().toISOString()});
 next.events.push(`${order.id}: ${action==='collect'?'simulated payment collected':order.status}.`);
 return next;
}


export function recordUse(state,day,slot,status,actionId){
 const recorded=(state.journal||[]).find(entry=>entry.day===day&&entry.slot===slot);
 const plan=state.versions.find(v=>v.id===(recorded?.version??state.active));if(!plan)throw Error('Approve a plan before recording use.');
 integer(day,1,plan.days,'plan day');integer(slot,1,plan.daily,'smoothie slot');
 if(!['taken','skipped','unrecorded'].includes(status)||!actionId)throw Error('Choose a journal action.');
 const next=copy(state);next.journal??=[];
 const previous=next.journal.find(entry=>entry.day===day&&entry.slot===slot);
 const retry=next.journal.flatMap(entry=>entry.history).find(event=>event.actionId===actionId);
 if(retry){if(retry.day!==day||retry.slot!==slot||retry.status!==status)throw Error('Journal action reference reused.');return next;}
 const entry={day,slot,status,version:plan.id,grams:status==='taken'?calculate(plan).servingGrams:0,history:previous?.history||[]};
 entry.history.push({actionId,day,slot,status,version:plan.id,grams:entry.grams,at:new Date().toISOString()});
 next.journal=next.journal.filter(item=>item.day!==day||item.slot!==slot);next.journal.push(entry);return next;
}
export function useSummary(state){
 const entries=state.journal||[];
 return {taken:entries.filter(e=>e.status==='taken').length,skipped:entries.filter(e=>e.status==='skipped').length,grams:Math.round(entries.reduce((n,e)=>n+(e.status==='taken'?e.grams:0),0)*1000)/1000};
}

export function supplySummary(state){
 const groups=new Map();
 function group(plan){const ingredients=plan.ingredients??baseIngredients,key=JSON.stringify(ingredients);if(!groups.has(key))groups.set(key,{versions:[],suppliedGrams:0,pendingGrams:0,usedGrams:0});const row=groups.get(key);if(!row.versions.includes(plan.id))row.versions.push(plan.id);return row;}
 for(const order of state.orders)for(const item of order.items){if(item.id!=='plan'||!item.plan)continue;const row=group(item.plan),grams=(item.supplyGrams??calculate(item.plan).packages*28)*item.quantity;if(order.status==='Simulated completed')row.suppliedGrams+=grams;else row.pendingGrams+=grams;}
 for(const entry of state.journal||[]){if(entry.status!=='taken')continue;const plan=state.versions.find(v=>v.id===entry.version);if(plan)group(plan).usedGrams+=entry.grams;}
 const active=state.versions.find(v=>v.id===state.active);if(active)group(active);
 return [...groups.values()].map(row=>({...row,usedGrams:Math.round(row.usedGrams*1000)/1000,balanceGrams:Math.round((row.suppliedGrams-row.usedGrams)*1000)/1000}));
}

export function refillQuote(state){
 const plan=state.versions.find(v=>v.id===state.active);
 if(!plan||state.active!==state.versions.at(-1)?.id||state.production!==state.active)throw Error('Approve and review the latest plan before preparing a refill.');
 if(state.recommendations.some(r=>r.status==='pending'))throw Error('Resolve the pending recommendation first.');
 requireNoExclusions(state,plan);
 const totals=calculate(plan),mix=JSON.stringify(plan.ingredients??baseIngredients);
 const supply=supplySummary(state).find(row=>row.versions.some(id=>JSON.stringify(state.versions.find(v=>v.id===id)?.ingredients??baseIngredients)===mix));
 if(supply?.pendingGrams>0)throw Error('A matching sample order is still pending. Complete or review it before preparing another refill.');
 if(supply?.balanceGrams<0)throw Error('Reported use exceeds recorded supply. Correct the sample records before calculating a refill.');
 const available=supply?.balanceGrams||0,needed=Math.max(0,Math.round((totals.grams-available)*1000)/1000),packages=Math.ceil(Math.round(needed*1000)/28000),supplyGrams=packages*28;
 return {version:plan.id,targetGrams:totals.grams,availableGrams:available,neededGrams:needed,packages,supplyGrams,leftoverGrams:Math.round((available+supplyGrams-totals.grams)*1000)/1000,cents:Math.round(totals.total*supplyGrams/(totals.packages*28))};
}
export function addRefill(state){
 const refill=refillQuote(state);if(!refill.packages)throw Error('Recorded sample supply already covers another plan period.');
 if(state.cart.some(item=>item.id==='plan'))throw Error('A sample plan or refill is already in the cart.');
 const next=copy(state),plan=next.versions.find(v=>v.id===next.active);
 next.cart.push({id:'plan',name:`Sample refill · version ${plan.id} · ${refill.packages} × 28 g`,quantity:1,cents:refill.cents,plan:copy(plan),refill:copy(refill),supplyGrams:refill.supplyGrams});return next;
}

export function supportPreview(state,message,orderId=null){
 if(typeof message!=='string'||!message.trim()||message.length>1500)throw Error('Enter a sample message of up to 1,500 characters.');
 const order=orderId?state.orders.find(item=>item.id===orderId):null;
 if(orderId&&!order)throw Error('Selected order is missing.');
 return {message:message.trim(),order:order?{id:order.id,status:order.status,paymentStatus:order.paymentStatus,items:order.items.map(item=>({name:item.name,quantity:item.quantity})),total:order.total}:null};
}
export function submitSupport(state,preview,actionId){
 if(!actionId)throw Error('Missing support reference.');
 const prior=(state.support||[]).find(item=>item.actionId===actionId);if(prior){if(JSON.stringify(prior.content)!==JSON.stringify(preview))throw Error('Support reference reused.');return copy(state);}
 const checked=supportPreview(state,preview.message,preview.order?.id||null);
 if(JSON.stringify(checked)!==JSON.stringify(preview))throw Error('Order details changed. Review your message again.');
 const next=copy(state);next.support??=[];next.support.push({id:`HELP-DEMO-${next.support.length+1}`,actionId,content:copy(preview),status:'Simulated received',createdAt:new Date().toISOString(),replies:[]});return next;
}
export function replySupport(state,id,text){
 if(typeof text!=='string'||!text.trim()||text.length>1500)throw Error('Enter a demo reply of up to 1,500 characters.');
 const next=copy(state),request=(next.support||[]).find(item=>item.id===id);if(!request)throw Error('Support request missing.');
 request.replies.push({author:'Demo Heartstone team',text:text.trim(),at:new Date().toISOString()});request.status='Simulated replied';return next;
}

export function compareProposal(state){
 const current=state.versions.find(v=>v.id===state.active),proposed=state.versions.at(-1);
 if(!current||!proposed||current.id===proposed.id)return null;
 const before=calculate(current),after=calculate(proposed),changes=[];
 const add=(field,oldValue,newValue,unit)=>{if(oldValue!==newValue)changes.push({field,before:oldValue,after:newValue,unit});};
 add('Plan length',current.days,proposed.days,'days');add('Daily smoothies',current.daily,proposed.daily,'per day');
 before.ingredients.forEach((ingredient,index)=>add(ingredient.name,ingredient.perServing,after.ingredients[index].perServing,'g per serving'));
 add('Serving weight',before.servingGrams,after.servingGrams,'g');add('Monthly powder',before.grams,after.grams,'g');add('Packages',before.packages,after.packages,'× 28 g');
 add('Sample selling price',before.total,after.total,'cents');add('Sample production cost',before.productionCost,after.productionCost,'cents');
 return {active:current.id,proposed:proposed.id,source:proposed.source,changes};
}
