const assert=require('node:assert/strict');
async function enterAdultDemo(page){
 const dialog=page.getByRole('dialog').filter({has:page.getByRole('heading',{name:'DATE QUEST™ · Adults only · 18+'})});
 await dialog.waitFor({state:'visible'});
 const enter=dialog.getByRole('button',{name:'Enter adult experience',exact:true});
 assert(await enter.isDisabled(),'Adult entry must start disabled.');
 assert(await page.locator('main').evaluate(e=>e.hidden&&e.inert),'App must remain hidden and inert before confirmation.');
 await dialog.getByRole('checkbox').check();
 assert(await enter.isEnabled(),'Explicit confirmation must enable entry.');
 await enter.click();await dialog.waitFor({state:'detached'});
 assert(await page.locator('main').isVisible(),'App opens after explicit entry.');
}
module.exports={enterAdultDemo};
