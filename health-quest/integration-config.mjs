export function integrationConfig(env){
 const required=['HQ_TEST_URL','HQ_TEST_PUBLISHABLE_KEY','HQ_TEST_MEMBER_A_EMAIL','HQ_TEST_MEMBER_A_PASSWORD','HQ_TEST_MEMBER_B_EMAIL','HQ_TEST_MEMBER_B_PASSWORD'];
 if(required.some(name=>!env[name]))throw Error('Missing test-project configuration. No network requests made.');
 const url=new URL(env.HQ_TEST_URL);
 if(url.protocol!=='https:'||!/^[-a-z0-9]+\.supabase\.co$/.test(url.hostname)||url.username||url.password||url.search||url.hash||url.pathname!=='/')throw Error('Use a dedicated hosted Supabase test project URL.');
 if(url.hostname==='iqxhqxlcraatdheslqeo.supabase.co')throw Error('The live Heartstone project is blocked by this test runner.');
 if(!env.HQ_TEST_PUBLISHABLE_KEY.startsWith('sb_publishable_'))throw Error('Use a test publishable key, never a secret or service-role key.');
 if(env.HQ_TEST_MEMBER_A_EMAIL===env.HQ_TEST_MEMBER_B_EMAIL)throw Error('Two different test accounts are required.');
 return {url:url.origin,key:env.HQ_TEST_PUBLISHABLE_KEY,a:{email:env.HQ_TEST_MEMBER_A_EMAIL,password:env.HQ_TEST_MEMBER_A_PASSWORD},b:{email:env.HQ_TEST_MEMBER_B_EMAIL,password:env.HQ_TEST_MEMBER_B_PASSWORD}};
}
