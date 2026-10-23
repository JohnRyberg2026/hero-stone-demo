// Local checks only. Never installs schemas, changes accounts or deploys a site.
const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
let tests=['test-wishes.cjs','test-archived-entry.cjs','test-date-entry.cjs','test-date-home.cjs','test-connection-selection.cjs','test-shared-date-service.cjs','test-shared-dates-ui.cjs','test-shared-date.cjs','test-quest-access.cjs','tests/moment-invitations.cjs','test-invitation-store-plan.cjs','test-store-ui.cjs','test-date-store.cjs','test-local-date-builder.cjs','test-private-fit.cjs','test-private-plan-review.cjs','test-storybook-drafts.cjs','test-storybook-account-store.cjs','test-storybook-relationship-store.cjs','test-recommendation-safety.cjs','test-recommendation-inputs.cjs','test-safe-adventure-discovery.cjs','test-recommendation-profile-boundary.cjs','test-adventure-preferences-store.cjs','test-adventure-preferences-setup.cjs','test-adventure-profile-flow.cjs','test-adventure-profile-view.cjs','test-adventure-profile-browser-load.cjs'];
const browserTests=['test-storybook-relationship-browser.cjs','test-multi-account-consent-browser.cjs','test-shared-dates-browser.cjs','test-wishes-browser.cjs','test-account-wishes-browser.cjs','test-adventure-profile-browser.cjs','test-storybook-browser.cjs','test-storybook-account-browser.cjs','test-heart-stone-companion-browser.cjs','test-heart-stone-welcome-browser.cjs','test-profile-planning-journey-browser.cjs','test-private-plan-review-browser.cjs','test-plan-invitation-browser.cjs','test-moment-storybook-browser.cjs'];
if(process.argv.includes('--browser-only'))tests=browserTests;
else if(process.argv.includes('--browser'))tests.push(...browserTests);
let failed=0;
for(const file of tests){
 if(!fs.existsSync(path.join(root,file))){console.error('MISSING '+file);failed++;continue;}
 const r=spawnSync(process.execPath,[file],{cwd:root,encoding:'utf8',timeout:browserTests.includes(file)?120000:30000});
 if(r.status!==0){failed++;console.error('FAIL '+file+'\n'+(r.stdout||'')+(r.stderr||'')+(r.error?.message||''));}
 else console.log('PASS '+file);
}
console.log(`${tests.length-failed}/${tests.length} local suites passed. This does not establish live-release readiness.`);
process.exitCode=failed?1:0;
