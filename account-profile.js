'use strict';
// Separate owner-only answers leave the existing first-journey/share flow untouched.
const sb = supabase.createClient('https://iqxhqxlcraatdheslqeo.supabase.co', 'sb_publishable_SIhJh737mEWvvmOm_4zuSw_4jh_BU_h');
const PREFIX = 'account_profile_v1_';
const phases = ['Get Me Started', 'Get to Know Me', 'Know Me Better'];
const text = (key, label) => ({key, label, kind:'free_text'});
const choice = (key, label, options) => ({key, label, options, kind:'single_choice'});
const multi = (key, label, options) => ({key, label, options, kind:'multi_choice'});
const adventureChoice={...choice('exploration','When we’re planning something for you, how adventurous do you want me to be?',['Familiar','Stretch','Wild']),labels:{Familiar:'FAMILIAR',Stretch:'STRETCH',Wild:'WILD'},descriptions:{Familiar:'Things I already know I’m likely to enjoy.',Stretch:'Push me a little beyond my usual choices.',Wild:'Surprise me. Take me somewhere I probably wouldn’t choose myself.'}};
const surpriseChoice={...choice('surprise','And how much do you like surprises?',['Tell Me Everything','Give Me Some Mystery','Surprise Me','WILD']),legacyOptions:['Tell me the details','Keep a little mystery','Surprise me within my boundaries']};
const enjoymentOptions=['Live music & concerts','Movies & theater','Comedy','Museums & history','Art & galleries','Festivals & fairs','Sports','Nature & wildlife','Beaches & water','Hiking & exploring','Gardening & farms','Markets & shopping','Games & competition','Classes & learning','Volunteering & community','Paranormal & unusual experiences','Local history & hidden places','Dancing & nightlife','Something else — Tell HEART STONE'];
const starterScreens=[
  {id:'starter_about',title:'A Little About You',phase:0,questions:[{...text('call_me','What should I call you?'),input:true,maxLength:80,help:'Optional. The name you want HEART STONE to use with you privately.'},multi('free_time','When you have free time, what sounds most like you?',['Stay close to home','Get outside','Try something new','Food & dining','Entertainment & events','Explore somewhere new','Surprise me'])]},
  {id:'starter_adventure',title:'Your Adventure Comfort Zone',phase:0,intro:'These are starting preferences. You can choose differently for an individual experience. Stretch, Wild, and surprises always stay within your boundaries.',questions:[adventureChoice,surpriseChoice]},
  {id:'starter_context',title:'Who Are We Planning For?',phase:0,intro:'Each person keeps their own preferences. Choosing someone here does not send an invitation or share your answers.',questions:[multi('planning_for','Who do you usually want me to help you create experiences with?',['My partner','Family','Friends','A group','Sometimes just me'])]},
  {id:'starter_connection',title:'What Helps You Feel Connected?',phase:0,intro:'Choose what feels right to you. You can change these preferences anytime.',questions:[multi('connection_styles','When you’re spending time with someone important to you, what makes you feel most connected?',['Good conversation','Laughing together','Trying something new together','Quiet time together','Being outdoors','Food & sharing a meal','Physical affection','Doing something thoughtful for each other','Creating memories together','Something else']),{...text('connection_other','What else helps you feel connected?'),showWhen:{key:'connection_styles',includes:'Something else'}}]},
  {id:'starter_timing',title:'Your Timing & Rhythm',phase:0,intro:'Availability is permission to suggest, never an obligation. You do not need to connect a calendar here.',questions:[multi('available_windows','When does getting out and doing something usually work best for you?',['Weekday mornings','Weekday afternoons','Weekday evenings','Friday nights','Weekend mornings','Weekend afternoons','Weekend evenings','My schedule changes a lot']),choice('planning_notice','How much notice do you usually like?',['Let’s go now','A few hours','A day or two','Several days','A week or more'])]},
  {id:'starter_energy',title:'Your Energy & Pace',phase:0,intro:'Your energy can change from day to day. You can skip any question or add accommodations later. No medical or personal disclosure is required.',questions:[{...multi('energy_pace','When we’re planning an experience, what kind of pace usually feels good to you?',['Easy & relaxed','A little active','Active & adventurous','It depends on the day']),descriptions:{'Easy & relaxed':'Keep it comfortable and unhurried.','A little active':'Walking and exploring.','Active & adventurous':'Experiences that get me moving.','It depends on the day':'Ask me when we’re planning.'}},multi('experience_length','How long does a typical experience feel right for you?',['An hour or two','A few hours','Half a day','Make a day of it','It depends on what we’re doing']),{...text('physical_comfort_notes','Is there anything that could make an experience physically uncomfortable for you?'),help:'Optional. Share only what helps you feel comfortable. You can add or change accommodations later in My Profile.'}]},
  {id:'starter_social',title:'Your Social Comfort',phase:0,intro:'This just helps set the vibe. You can change it anytime. Crowd comfort and meeting new people are separate preferences.',questions:[multi('social_settings','What kind of social setting usually feels best to you?',['Just us','Small and comfortable','Lively and social','Big crowds are fine','It depends on my mood']),multi('meeting_people','How do you feel about meeting or interacting with new people during an experience?',['Love it','Sometimes','Only if it happens naturally','I’d rather stick with my own group'])]},
  {id:'starter_food',title:'Your Food & Dining Style',phase:0,intro:'Pick what sounds like you. Food preferences and foods you can’t have stay separate, private, and editable.',questions:[multi('food_adventurousness','When food is part of the experience, what sounds most like you?',['I know what I like','I’ll try something new sometimes','I love discovering new foods','Surprise me with something I’d never find myself','It depends on my mood']),multi('food_experiences','What kinds of food experiences do you enjoy?',['Casual local spots','Hidden gems','Food trucks & markets','Coffee shops & bakeries','Nice sit-down restaurants','Fine dining & special occasions','International foods','Cooking or food experiences','Dessert stops','Picnics & outdoor dining']),{...text('food_dislikes','Foods I don’t like or don’t want'),sectionHeading:'Are there foods you can’t or don’t want to eat?',help:'Optional preferences. Disliking a food is different from an allergy or a food you can’t have.'},{...text('food_requirements','Foods I can’t have or must avoid'),help:'Optional. Allergies and dietary requirements belong here. Share only what needs to be respected; no medical details are required.'}]},
  {id:'starter_interests',title:'What Are You Into?',phase:0,intro:'Pick whatever jumps out. We can add more anytime. Curiosity stays separate from things you already enjoy.',questions:[multi('enjoyed_interests','What kinds of things do you already enjoy?',enjoymentOptions),{...text('enjoyed_other','What else do you already enjoy?'),showWhen:{key:'enjoyed_interests',includes:'Something else — Tell HEART STONE'}},{...text('curious_interests','What are you curious about, even if you haven’t tried it yet?'),help:'Optional. Add as many ideas as you like. Being curious does not mark something as an existing like.'}]}
];
const sections = [
  {id:'about', title:'About Me', phase:0, intro:'Your profile belongs to you. Share only what helps you feel understood.', questions:[text('everyday_life','What would you like HEART STONE to know about your everyday life?')]},
  {id:'interests', title:'Interests & Likes', phase:0, questions:[multi('interests','What do you enjoy?',['Nature','Bookstores','Local history','Food discoveries','Music','Art','Games','Volunteering','Learning','Road trips']),text('other_interests','Anything else you enjoy?')]},
  {id:'avoid', title:'Things to Avoid', phase:0, intro:'Leaving this blank means unknown. It never means you are comfortable with everything.', questions:[text('avoid','What would you rather avoid?')]},
  {id:'food', title:'Food & Dining', phase:1, questions:[text('food_likes','What kinds of food do you enjoy?'),text('food_needs','Any food restrictions or allergies you want considered?')]},
  {id:'entertainment', title:'Entertainment & Activities', phase:1, questions:[multi('activities','Which activities sound enjoyable?',['Live music','Movies','Museums','Theater','Sports','Crafting','Cooking','Gardening']),text('other_activities','What else do you enjoy doing?')]},
  {id:'adventure', title:'Adventure & Exploration', phase:1, questions:[adventureChoice,text('adventure_notes','What would make exploring feel comfortable?')]},
  {id:'bucket', title:'Bucket List', phase:1, questions:[text('bucket_list','What is something you would love to experience someday?')]},
  {id:'connection', title:'Romance & Connection', phase:1, questions:[text('connection','What helps you feel connected and appreciated?')]},
  {id:'scheduling', title:'Time & Scheduling', phase:1, intro:'Availability is permission to suggest, never an obligation. This page does not connect an external calendar.', questions:[text('timing','When does time together usually fit your life?'),text('rhythm','What pace or frequency feels comfortable?')]},
  {id:'budget', title:'Budget & Spending Comfort', phase:1, questions:[choice('budget_style','What spending approach usually feels comfortable?',['Free experiences','Keep costs low','Ask me each time','Flexible for special occasions']),text('budget_notes','Any spending limits you want respected?')]},
  {id:'travel', title:'Travel & Transportation', phase:2, questions:[text('travel','How far do you usually feel comfortable traveling?'),text('transport','What should we know about transportation?')]},
  {id:'comfort', title:'Physical & Social Comfort', phase:2, questions:[choice('pace','What pace usually feels comfortable?',['Gentle','Moderate','Active','Depends on the day']),choice('social','What social setting do you usually prefer?',['Just us','Small groups','Larger groups','Depends on the day'])]},
  {id:'accessibility', title:'Accessibility & Accommodations', phase:2, intro:'Required accommodations are boundaries, never challenges to stretch.', questions:[text('accessibility','What would help make an experience accessible and comfortable?')]},
  {id:'boundaries', title:'Boundaries & Hard No’s', phase:2, questions:[text('hard_nos','What should never be suggested?'),text('ask_first','What should HEART STONE ask about first?')]},
  {id:'surprise', title:'Surprise & Control', phase:2, questions:[surpriseChoice,text('surprise_notes','What do you always want to know beforehand?')]},
  {id:'planning', title:'Planning & Decision Style', phase:2, questions:[choice('planning','How would you like HEART STONE to help?',['Help me plan','Share the planning','Do most of the planning']),choice('decisions','How would you like choices presented?',['Show Me Everything','Give Me 3','Recommend the Best One','Just Decide for Me'])]},
  {id:'privacy', title:'Privacy & Sharing', phase:2, intro:'Answers on this page stay private to your account. Writing a preference here does not grant sharing permission. Partner sharing remains a separate explicit action in Getting to Know You.', questions:[text('privacy_notes','What would you like HEART STONE to understand about your privacy preferences?')]}
];
const questions = [...new Map([...starterScreens,...sections].flatMap(s=>s.questions).map(q=>[q.key,q])).values()];
const starterKeys=new Set(starterScreens.flatMap(s=>s.questions.map(q=>q.key)));
const reviewSections=[...starterScreens,...sections.map(s=>({...s,questions:s.questions.filter(q=>!starterKeys.has(q.key))})).filter(s=>s.questions.length)];
const $ = id => document.getElementById(id);
let owner=null, generation=0, answers={}, pending=new Map(), queue=Promise.resolve(), timer=null, current='overview', loading=true, saving=0, retryNeeded=false;
function note(message){$('status').textContent=message;}
function retryState(value){retryNeeded=value;if($('retrySave'))$('retrySave').hidden=!value;}
function button(label, action, primary=false){const b=document.createElement('button');b.type='button';b.textContent=label;if(primary)b.className='primary';b.onclick=action;return b;}
function paragraph(message, className=''){const p=document.createElement('p');p.textContent=message;p.className=className;return p;}
function questionVisible(q){return !q.showWhen||(answers[q.showWhen.key]||[]).includes(q.showWhen.includes)||(typeof answers[q.key]==='string'&&answers[q.key].trim().length>0);}
function syncConditionalQuestions(){for(const q of questions){const box=$('question-'+q.key);if(box)box.hidden=!questionVisible(q);}}
function card(title){const c=document.createElement('section');const h=document.createElement('h2');h.tabIndex=-1;h.textContent=title;c.append(h);$('app').append(c);return c;}
function stage(key, value, kind='free_text'){
  if(!owner || loading)return;
  answers[key]=value;
  pending.set(key,{value,kind});
  note('Changes waiting to save…');
  clearTimeout(timer);timer=setTimeout(()=>flush(),500);
}
async function flush(){
  clearTimeout(timer);
  const token=generation, user=owner;
  // Serialize saves so rapid edits never let an older response overwrite a newer answer.
  const job=async()=>{
    if(token!==generation || !user)return false;
    if(!pending.size)return true;
    const batch=new Map(pending);pending.clear();
    saving++;
    note('Saving to your private account…');
    try{
      const {data,error:authError}=await sb.auth.getUser();
      if(authError || data?.user?.id!==user)throw new Error('Please sign in to your account again.');
      if(token!==generation)return false;
      const rows=[...batch].map(([key,a])=>({user_id:user,question_key:PREFIX+key,answer_kind:a.kind,answer_json:{value:a.value},skipped:a.value===null,updated_at:new Date().toISOString()}));
      const result=await sb.from('user_onboarding_answers').upsert(rows,{onConflict:'user_id,question_key'}).select('question_key');
      if(result.error)throw result.error;
      if(result.data?.length!==rows.length)throw new Error('Your changes could not be confirmed.');
      if(token!==generation)return false;
      retryState(false);
      note(pending.size?'More changes waiting to save…':'Saved to your private account.');
      return true;
    }catch(e){
      if(token!==generation)return false;
      for(const [key,a] of batch)if(!pending.has(key))pending.set(key,a);
      retryState(true);
      note('Not saved: '+e.message+' Use Retry Save before leaving.');
      return false;
    }finally{saving--;}
  };
  queue=queue.then(job,job);
  return queue;
}
async function navigate(destination){
  if(!await flush())return;
  if(starterScreens.some(s=>s.id===destination)){
    stage('starter_resume',destination);stage('starter_started',true,'boolean');if(!await flush())return;
  }else if(sections.some(s=>s.id===destination)){
    stage('resume',destination);if(!await flush())return;
  }
  current=destination;render();$('app').querySelector('h2')?.focus();
}
function render(){
  $('app').replaceChildren();
  if(loading)return;
  if(!owner){const c=card('Sign in to your HEART STONE account');c.append(paragraph('Your profile saves to your own account. Return home to create an account or sign in.'));return;}
  if(current==='welcome'){
    const c=card('Let’s get to know you a little.');
    c.append(paragraph('Just a few things to start, so I can create better experiences for you. You can stop anytime and come back.'));
    c.append(paragraph('Every answer is optional. Your profile can grow and change with you.','muted'));
    const row=document.createElement('div');row.className='row';
    row.append(button('Get Started',()=>navigate('starter_about'),true),button('I’ll Do This Later',()=>leaveProfile()));c.append(row);
  }else if(current==='starter_pause'){
    const c=card('Your profile grows with you');c.append(paragraph('Your choices are saved. Add a little more whenever you want, or return to HEART STONE now.'));
    const row=document.createElement('div');row.className='row';row.append(button('Tell HEART STONE More',()=>navigate('overview'),true),button('Back to HEART STONE',()=>leaveProfile()),button('Review My Profile',()=>navigate('review')));c.append(row);
  }else if(current==='overview'){
    const c=card('Your living profile');
    c.append(paragraph('Start with a few helpful details. You can skip any question, stop anytime, and return to change or deepen your answers. There is no completion score.'));
    c.append(paragraph('Your supported interests and free-experience preference can now inform the private first journey preview. Written requirements pause sample suggestions until they can be checked.','muted'));
    const row=document.createElement('div');row.className='row';
    const starterResume=starterScreens.find(s=>s.id===answers.starter_resume)?.id || 'starter_about';
    row.append(button(answers.starter_started?'Continue Getting Started':'Get Started',()=>navigate(starterResume),true));
    const resume=sections.find(s=>s.id===answers.resume)?.id || 'about';
    row.append(button('Continue My Profile',()=>navigate(resume),true),button('Review My Profile',()=>navigate('review')));c.append(row);const preview=document.createElement('a');preview.href='./heart-stone-first-journey.html';preview.textContent='Try a private adventure preview';preview.onclick=async e=>{e.preventDefault();if(await flush())location.href=preview.href;};c.append(preview);
    phases.forEach((phase,i)=>{const p=card(phase);p.append(paragraph(i===0?'A few essentials to help you begin.':'Tell HEART STONE More, whenever you want.','muted'));const list=document.createElement('div');list.className='section-list';sections.filter(s=>s.phase===i).forEach(s=>list.append(button(s.title,()=>navigate(s.id))));p.append(list);});
  }else if(current==='review'){
    const c=card('Review My Profile');c.append(paragraph('Unknown stays unknown. Skip for Now keeps any previously saved answer. Use Leave Unanswered to remove an answer.'));
    reviewSections.forEach(s=>{const item=document.createElement('section');const h=document.createElement('h3');h.textContent=s.title;item.append(h);const dl=document.createElement('dl');s.questions.forEach(q=>{const dt=document.createElement('dt');dt.textContent=q.label;const dd=document.createElement('dd');const v=answers[q.key];dd.textContent=v===null||v===undefined||v===''||(Array.isArray(v)&&!v.length)?'Not answered':Array.isArray(v)?v.join(', '):v;dl.append(dt,dd);});item.append(dl,button('Edit '+s.title,()=>navigate(s.id)));c.append(item);});
    c.append(button('Back to My Profile',()=>navigate('overview')));
  }else{
    const isStarter=starterScreens.some(s=>s.id===current);
    const s=[...starterScreens,...sections].find(s=>s.id===current);if(!s){current='overview';render();return;}
    const c=card(s.title);c.prepend(paragraph(phases[s.phase],'phase'));
    c.append(paragraph(s.intro || 'Every answer is optional. You can change it anytime.','muted'));
    if(s.id==='about'){const p=paragraph('Your name and how HEART STONE refers to you are managed in Profile & Settings on the home page.');c.append(p);}
    s.questions.forEach(q=>{
      if(q.sectionHeading){const heading=document.createElement('h3');heading.textContent=q.sectionHeading;c.append(heading);}
      const box=document.createElement('div');box.className='question';box.id='question-'+q.key;box.hidden=!questionVisible(q);const label=document.createElement('label');label.textContent=q.label;box.append(label);
      if(q.help)box.append(paragraph(q.help,'muted'));
      if(q.kind==='free_text'){
        const input=document.createElement(q.input?'input':'textarea');input.id=q.key;input.maxLength=q.maxLength||2000;if(q.input){input.type='text';input.autocomplete='nickname';}input.value=answers[q.key]||'';label.htmlFor=q.key;
        input.oninput=()=>stage(q.key,input.value.trim()||null,q.kind);box.append(input);
      }else{
        const group=document.createElement('div');group.className='choices';group.setAttribute('role','group');group.setAttribute('aria-label',q.label);
        box.append(paragraph(q.kind==='multi_choice'?'Choose all that apply.':'Choose one default. You can change it anytime.','muted'));
        if(q.legacyOptions?.includes(answers[q.key]))box.append(paragraph('Saved earlier: '+answers[q.key]+'. Choose an option below whenever you want to update it.','muted'));
        q.options.forEach(option=>{
          const selected=()=>q.kind==='multi_choice'?(answers[q.key]||[]).includes(option):answers[q.key]===option;
          const b=button(q.labels?.[option]||option,()=>{const value=q.kind==='multi_choice'?(selected()?answers[q.key].filter(v=>v!==option):[...(answers[q.key]||[]),option]):option;stage(q.key,Array.isArray(value)&&!value.length?null:value,q.kind);for(const child of group.children)child.setAttribute('aria-pressed',q.kind==='multi_choice'?(answers[q.key]||[]).includes(child.dataset.option):answers[q.key]===child.dataset.option);if(q.key==='planning_for'&&$('companionNote'))$('companionNote').hidden=!(answers.planning_for||[]).includes('My partner');syncConditionalQuestions();});
          b.dataset.option=option;b.setAttribute('aria-label',q.labels?.[option]||option);b.setAttribute('aria-pressed',selected());if(q.descriptions?.[option]){const description=document.createElement('small');description.textContent=q.descriptions[option];description.id=q.key+'-option-'+q.options.indexOf(option)+'-description';b.append(description);b.setAttribute('aria-describedby',description.id);}group.append(b);
        });box.append(group);
      }
      box.append(button('Leave Unanswered',()=>{stage(q.key,null,q.kind);render();}));c.append(box);
    });
    if(s.id==='starter_context'){const p=paragraph('When your partner has their own profile, I can bring both of your preferences together—without either of you having to give up what matters to you.','muted');p.id='companionNote';p.hidden=!(answers.planning_for||[]).includes('My partner');c.append(p);}
    const sequence=isStarter?starterScreens:sections,index=sequence.indexOf(s),next=sequence[index+1]?.id || (isStarter?'starter_pause':'review');const row=document.createElement('div');row.className='row';
    row.append(button('Save & Continue',()=>navigate(next),true),button('Skip for Now',()=>navigate(next)),button('Save & Finish Later',async()=>{if(await flush()){current='overview';render();note('Saved. Return whenever you want.');}}),button('Back',()=>navigate(sequence[index-1]?.id || (isStarter?'welcome':'overview'))));c.append(row);
  }
  if(current!=='welcome'||retryNeeded){const row=document.createElement('div');row.className='row';const retry=button('Retry Save',()=>flush());retry.id='retrySave';retry.hidden=!retryNeeded;row.append(retry);if(current!=='overview')row.append(button('My Profile',()=>navigate('overview')));$('app').append(row);}
}
async function boot(){
  const token=++generation;owner=null;answers={};pending.clear();clearTimeout(timer);retryNeeded=false;loading=true;render();$('identity').textContent='';note('Loading your private profile…');
  try{
    const {data,error}=await sb.auth.getUser();if(error)throw error;if(token!==generation)return;
    if(!data?.user){loading=false;note('Sign in to begin or resume.');render();return;}
    const user=data.user.id;
    const result=await sb.from('user_onboarding_answers').select('question_key,answer_json,skipped').eq('user_id',user).like('question_key',PREFIX+'%');
    if(result.error)throw result.error;
    const active=await sb.auth.getUser();if(token!==generation || active.data?.user?.id!==user)return;
    const allowed=new Set([...questions.map(q=>q.key),'resume','starter_resume','starter_started']);
    for(const row of result.data||[]){if(!row.question_key.startsWith(PREFIX))continue;const key=row.question_key.slice(PREFIX.length),q=questions.find(q=>q.key===key),v=row.skipped?null:row.answer_json?.value;if(!allowed.has(key))continue;if(key==='resume'){if(sections.some(s=>s.id===v))answers[key]=v;}else if(key==='starter_resume'){if(starterScreens.some(s=>s.id===v))answers[key]=v;}else if(key==='starter_started'){if(typeof v==='boolean')answers[key]=v;}else if(v===null)answers[key]=null;else if(q.kind==='multi_choice'&&Array.isArray(v))answers[key]=v.filter(x=>q.options.includes(x));else if(q.kind==='single_choice'&&(q.options.includes(v)||q.legacyOptions?.includes(v)))answers[key]=v;else if(q.kind==='free_text'&&typeof v==='string')answers[key]=v;}
    owner=user;loading=false;current=answers.starter_started||answers.resume?'overview':'welcome';$('identity').textContent='Signed in as '+(data.user.email||'your account');note('Your private profile is ready.');render();
  }catch(e){if(token!==generation)return;note('Could not load your profile: '+e.message);const c=card('Try loading again');c.append(button('Retry Load',()=>boot()));}
}
async function leaveProfile(){if(loading&&!owner){location.href='./index.html';return;}if(await flush())location.href='./index.html';}
$('home').addEventListener('click',async e=>{e.preventDefault();await leaveProfile();});
window.addEventListener('beforeunload',e=>{if(pending.size||saving){e.preventDefault();e.returnValue='';}});
sb.auth.onAuthStateChange((event,session)=>{if(event==='SIGNED_OUT'||(event==='SIGNED_IN'&&session?.user?.id!==owner))setTimeout(()=>boot(),0);});
boot();
