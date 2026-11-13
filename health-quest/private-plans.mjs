// Test-only sample plans; no production, clinician or payment authority.
export function privatePlans(client, expectedUser) {
 if(!expectedUser)throw new Error('Sign in to Health Quest.');
 async function account(){const {data,error}=await client.auth.getUser();if(error||data?.user?.id!==expectedUser)throw new Error('Account changed. Reopen Health Quest.');}
 async function rpc(name,args){await account();const {data,error}=await client.rpc(name,{p_expected_user:expectedUser,...args});if(error)throw new Error('Plan was not confirmed saved. Reload before trying again.',{cause:error});await account();if(data?.owner_id!==expectedUser||data.plan_id!==args.p_plan_id)throw new Error('Plan save could not be confirmed.');return data;}
 return {
  async list(){await account();const result={};for(const [key,table] of [['versions','health_quest_plan_versions'],['approvals','health_quest_plan_approvals']]){const {data,error}=await client.from(table).select('*').eq('owner_id',expectedUser).order('version');if(error)throw new Error('Plans could not be loaded.');result[key]=data;}await account();return result;},
  async propose({planId,expectedVersion,payload,actionId,reviewed=false}){if(reviewed!==true)throw new Error('Review the proposal before saving.');return rpc('health_quest_propose_plan',{p_plan_id:planId,p_expected_version:expectedVersion,p_payload:payload,p_action_id:actionId});},
  async approve({planId,version,actionId,approved=false}){if(approved!==true)throw new Error('Explicit plan approval required.');return rpc('health_quest_approve_plan',{p_plan_id:planId,p_version:version,p_action_id:actionId,p_approved:true});}
 };
}
