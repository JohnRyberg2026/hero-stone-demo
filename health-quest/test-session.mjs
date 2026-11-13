import { mountMember } from './member.mjs';
export async function mountTestSession(doc,client,{openMember=mountMember}={}){
 const q=id=>doc.getElementById(id);let member=null,owner=null,epoch=0,busy=false;
 const message=text=>q('session-status').textContent=text;
 function controls(){q('test-signin').hidden=!!owner;q('test-signout').hidden=!owner;q('test-signout').disabled=busy;q('test-login').disabled=busy;}
 function close(){epoch++;member?.destroy();member=null;owner=null;q('workspace').hidden=true;q('records').replaceChildren();q('text').value='';q('review-text').textContent='';q('review-details').textContent='';q('test-password').value='';controls();}
 async function open(user){const token=++epoch;member?.destroy();member=null;owner=null;controls();
  const profile=await client.from('profiles').upsert({id:user.id},{onConflict:'id',ignoreDuplicates:true});
  if(token!==epoch)return;
  if(profile.error)throw Error('Your test profile could not be prepared.');
  const current=await client.auth.getUser();if(token!==epoch)return;
  if(current.error||current.data?.user?.id!==user.id)throw Error('Your account changed. Sign in again.');
  owner=user.id;controls();const mounted=await openMember(doc,client);
  if(token!==epoch){mounted.destroy();return;}member=mounted;message('Signed into Health Quest Test. Use fictional notes only.');
 }
 q('test-signin').onsubmit=async event=>{event.preventDefault();if(busy)return;busy=true;controls();message('Signing into the test project…');
  const credentials={email:q('test-email').value.trim(),password:q('test-password').value};
  q('test-password').value='';
  try{const result=await client.auth.signInWithPassword(credentials);if(result.error||!result.data?.user)throw Error('Test sign-in failed. Check the account and password.');await open(result.data.user);}
  catch{close();message('Could not open your test account. Check sign-in details and test-project configuration.');}
  finally{busy=false;controls();}
 };
 q('test-signout').onclick=async()=>{if(busy)return;busy=true;close();controls();try{const result=await client.auth.signOut();if(result.error)throw Error('failed');message('Signed out. Private notes cleared from this screen.');}catch{message('Screen cleared, but server sign-out was not confirmed.');}finally{busy=false;controls();}};
 const subscription=client.auth.onAuthStateChange((event,session)=>{if(event==='SIGNED_OUT'||(owner&&owner!==session?.user?.id)){close();message('Account changed. Sign in or reload to continue.');}});
 try{const auth=await client.auth.getUser();if(!auth.error&&auth.data?.user)await open(auth.data.user);else message('Use an existing account from Health Quest Test, separate from live Heartstone.');}catch{close();message('Could not restore the test session. Sign in again.');}
 controls();return {destroy(){close();subscription.data?.subscription?.unsubscribe();}};
}
