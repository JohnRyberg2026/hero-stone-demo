const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync('index.html','utf8');
for(const [,source] of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g))new vm.Script(source);
const start=html.indexOf('async function loadExistingHeartStone(){'),end=html.indexOf('$("addDatingConnectionBtn").onclick',start);
const source=html.slice(start,end);
function setup(rows,requestedConnection=null){
 const calls=[],elements={connectionLinks:{children:[],replaceChildren(){this.children=[]},append(x){this.children.push(x)}},connectionSelectionStatus:{},connectionInviteStatus:{}},journeyLink={};
 let user={id:'owner'};const query={select(){return this},eq(...v){calls.push(v);return this},order(){return this},limit:async n=>{assert.equal(n,100);return {data:rows}}};
 const context=vm.createContext({heartStoneId:'',requestedConnection,sb:{rpc:async(name,args)=>{assert.equal(name,'get_moment_invitation_partners');return {data:[{name:'Partner '+args.p_heart_stone_id}]};},from:name=>{assert.equal(name,'heart_stone_memberships');return query}},currentUser:async()=>user,$:id=>elements[id],status:(id,value)=>elements[id].textContent=value,show:(id,on)=>calls.push(['show',id,on]),document:{createElement:()=>({style:{}}),querySelectorAll:()=>[journeyLink]},encodeURIComponent,setConnectedUI:()=>calls.push(['connect']),step:()=>{},startAutomaticPartnerSync:()=>calls.push(['sync']),loadSharedDemoState:async()=>calls.push(['load'])});
 vm.runInContext(source,context);return {context,calls,elements,journeyLink,setUser:value=>user=value};
}
(async()=>{
 let x=setup([{heart_stone_id:'a'},{heart_stone_id:'b'}]);await x.context.loadExistingHeartStone();assert.equal(x.context.heartStoneId,'');assert(!x.calls.some(c=>c[0]==='load'));assert.match(x.elements.connectionSelectionStatus.textContent,/None is selected/);assert.equal(x.elements.connectionLinks.children.length,2);assert.equal(x.elements.connectionLinks.children[0].textContent,'With Partner a');
 x=setup([{heart_stone_id:'a'},{heart_stone_id:'b'}],'b');await x.context.loadExistingHeartStone();assert.equal(x.context.heartStoneId,'b');assert(x.journeyLink.href.endsWith('?connection=b'));assert(x.calls.some(c=>c[0]==='load'));
 x=setup([{heart_stone_id:'a'}]);await x.context.loadExistingHeartStone();assert.equal(x.context.heartStoneId,'a');
 x=setup([{heart_stone_id:'a'}],'someone-elses-id');await x.context.loadExistingHeartStone();assert.equal(x.context.heartStoneId,'');assert(!x.calls.some(c=>c[0]==='sync'));
 x=setup([]);await x.context.loadExistingHeartStone();assert.equal(x.context.heartStoneId,'');
 assert(!html.includes('let heartStoneId = localStorage.getItem'));assert(!source.includes('limit(1)'));
 const journey=fs.readFileSync('heart-stone-first-journey.html','utf8');for(const [,s] of journey.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g))new vm.Script(s);
 assert(journey.includes("memberships.data?.length===1"));assert(journey.includes("chosenConnection?(memberships.data||[]).find"));assert(!journey.includes(".limit(1).maybeSingle()"));
 const create=html.slice(html.indexOf('$("createInviteBtn").onclick'),html.indexOf('$("acceptInviteBtn").onclick'));assert(!create.includes('heartStoneId='));assert(!create.includes('heartStoneId ='));assert(!create.includes('startAutomaticPartnerSync'));
 const accept=html.slice(html.indexOf('$("acceptInviteBtn").onclick'),html.indexOf('$("questBtn").onclick'));assert(accept.includes('location.assign("index.html?connection="'));
 console.log('PASS: explicit multi-connection selection; safe single-connection fallback; outsider/no-membership handling; profile-sharing scope; pending invitations preserve selection; account cache is not trusted; switching uses full navigation.');
})().catch(e=>{console.error(e);process.exitCode=1});
