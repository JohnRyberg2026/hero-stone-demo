(function(){
 'use strict';
 const $=id=>document.getElementById(id);let consentStore=null,consentVersion=0,consentPending=false;let store=null,account=null,version=0,pending=false,personalBusy=false;
 function resetConsent(clearBooks=true){consentVersion++;consentPending=false;consentStore?.invalidate();if(clearBooks){$('consentBook').replaceChildren(new Option('Choose a listed book',''));$('consentAction').value='';}$('bookConsentStatus').textContent='No consent status checked.';}
 function controls(){ $('consentBook').disabled=!account||pending||personalBusy||!$('consentBook').options[1];$('consentAction').disabled=!account||pending||personalBusy;$('checkBookConsent').disabled=!account||pending||personalBusy||consentPending||!$('consentBook').value||!$('consentAction').value; $('refreshBookRelationships').disabled=!account||pending||personalBusy;$('bookRelationship').disabled=!account||personalBusy;$('listRelationshipBooks').disabled=!account||!$('bookRelationship').value||pending||personalBusy; }
 function clear(){resetConsent();version++;account=null;pending=false;store?.invalidate();$('bookRelationship').replaceChildren(new Option('Choose a relationship',''));$('relationshipBookList').replaceChildren();$('relationshipBookStatus').textContent='Account changed. Connect again to view relationship books.';controls();}
 window.addEventListener('storybook:account-cleared',clear);
 window.addEventListener('storybook:controls',event=>{personalBusy=event.detail.busy;controls();});
 window.addEventListener('storybook:account-ready',event=>{store?.dispose();consentStore?.dispose();resetConsent();account=event.detail.account;store=window.StorybookRelationshipStore.create({client:event.detail.client,onAccountChange:clear});consentStore=window.StorybookConsentStore.create({client:event.detail.client,onAccountChange:clear});version++;$('bookRelationship').replaceChildren(new Option('Choose a relationship',''));$('relationshipBookList').replaceChildren();$('relationshipBookStatus').textContent='Connected. Find your relationships when ready. Nothing loaded automatically.';controls();});
 $('bookRelationship').onchange=()=>{resetConsent();version++;store?.invalidate();pending=false;$('relationshipBookList').replaceChildren();$('relationshipBookStatus').textContent='Relationship changed. List its books when ready.';controls();};
 $('refreshBookRelationships').onclick=async()=>{
  if(!account||pending||personalBusy)return;resetConsent();const token=++version,owner=account;pending=true;$('relationshipBookList').replaceChildren();$('bookRelationship').replaceChildren(new Option('Choose a relationship',''));controls();$('relationshipBookStatus').textContent='Checking your relationships…';
  const result=await store.relationships(owner);if(token!==version||account!==owner)return;pending=false;
  if(result.ok){for(const r of result.relationships)$('bookRelationship').append(new Option(r.label,r.id));$('relationshipBookStatus').textContent=result.relationships.length?'Choose a relationship. No books have been loaded.':'No active relationships found for this account.';}
  else $('relationshipBookStatus').textContent='Relationships could not be loaded. The reviewed reader may be unavailable. Your personal book is unchanged.';controls();
 };
 $('listRelationshipBooks').onclick=async()=>{
  const relationship=$('bookRelationship').value;if(!account||!relationship||pending||personalBusy)return;resetConsent();const token=++version,owner=account;pending=true;$('relationshipBookList').replaceChildren();controls();$('relationshipBookStatus').textContent='Checking this relationship’s book summaries…';
  const result=await store.list(owner,relationship);if(token!==version||account!==owner||$('bookRelationship').value!==relationship)return;pending=false;
  if(!result.ok){$('relationshipBookStatus').textContent='Book summaries could not be verified. This is not an empty-book result. Recheck your relationship access or try again.';controls();return;}
  for(const volume of result.volumes){$('consentBook').append(new Option(volume.title,volume.id));const card=document.createElement('article'),title=document.createElement('h3'),meta=document.createElement('p');title.textContent=volume.title;meta.textContent=(volume.year===null?'Year not set':volume.year)+' · Relationship book · '+volume.state;card.append(title,meta);$('relationshipBookList').append(card);}
  $('relationshipBookStatus').textContent=result.volumes.length?(result.mayHaveMore?'Showing up to 100 summaries. More may exist. ':'Summaries loaded. ')+'Book contents have not been opened, copied or changed.':'No book summaries found for this selected relationship.';controls();
 };
 $('consentBook').onchange=$('consentAction').onchange=()=>{resetConsent(false);controls();};
 $('checkBookConsent').onclick=async()=>{
  const book=$('consentBook').value,relationship=$('bookRelationship').value,action=$('consentAction').value;
  if(!account||!book||!relationship||!action||pending||personalBusy||consentPending)return;
  const token=++consentVersion,owner=account;consentPending=true;controls();$('bookConsentStatus').textContent='Checking current consent status…';
  const result=await consentStore.review(owner,book,relationship,action);
  if(token!==consentVersion||owner!==account||book!==$('consentBook').value||relationship!==$('bookRelationship').value||action!==$('consentAction').value)return;
  consentPending=false;
  if(!result.ok)$('bookConsentStatus').textContent='Consent status could not be verified. Do not treat this as approval. Check access or try again.';
  else {const own={approved:'approved',declined:'declined',withdrawn:'withdrawn'}[result.status.ownResponse]||'no response recorded';$('bookConsentStatus').textContent='Your response for this version: '+own+'. '+(result.status.allApproved?'All required responses are recorded as approved for this version.':'Full consent is not recorded for this version.')+' Status checked now; it can change. Publication and export remain unavailable.';}
  controls();
 };
 controls();
})();
