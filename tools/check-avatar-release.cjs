// Combined local verification. No schema installation, account mutation or deployment.
'use strict';
const path=require('node:path'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),flags=new Set(process.argv.slice(2));
const allowed=new Set(['--browser','--browser-only','--dom']);
if([...flags].some(f=>!allowed.has(f))||(flags.has('--browser')&&flags.has('--browser-only'))){
 console.error('Usage: node tools/check-avatar-release.cjs [--browser | --browser-only] [--dom]');process.exit(2);
}
const browserOnly=flags.has('--browser-only'),browser=browserOnly||flags.has('--browser');
let failed=0,checks=0;
function run(file,args=[],env={},timeout=120000){
 checks++;const result=spawnSync(process.execPath,[file,...args],{cwd:root,env:{...process.env,...env},stdio:'inherit',timeout});
 if(result.status!==0){failed++;console.error('FAIL '+file+(env.AVATAR_WELCOME?' ('+env.AVATAR_WELCOME+')':'')+(result.error?' — '+result.error.message:''));}
}
// Preserve the application runner as the authority for its current suite list.
run('tools/export-avatar-device-check.cjs',['--check']);
run('tools/check-date-release.cjs',browserOnly?['--browser-only']:browser?['--browser']:[],{},1200000);
if(!browserOnly){run('test-heart-stone-avatar-voice.cjs');run('test-heart-stone-avatar-motion.cjs');run('test-heart-stone-avatar-gait.cjs');}
if(flags.has('--dom'))for(const mode of ['', '1', 'actual'])run('test-heart-stone-avatar-dom.cjs',[],{AVATAR_WELCOME:mode});
if(browser){
 for(const mode of ['', '1', 'actual'])run('test-heart-stone-avatar-preview-browser.cjs',[],{AVATAR_WELCOME:mode});
 run('test-heart-stone-avatar-preview-browser.cjs',[],{AVATAR_DEVICE:'1',AVATAR_WELCOME:''});
 run('test-heart-stone-avatar-storybook-browser.cjs');
}
console.log(`${checks-failed}/${checks} verification groups passed. Device audio, backend installation and release approval are separate.`);
process.exitCode=failed?1:0;
