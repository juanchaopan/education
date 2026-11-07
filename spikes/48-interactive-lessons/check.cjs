
const {chromium}=require(process.env.SPIKE48_PLAYWRIGHT);
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const assert=require('node:assert/strict');
(async()=>{
const browser=await chromium.launch({executablePath:process.env.SPIKE48_CHROME});
try{
const base=pathToFileURL(path.join(__dirname,process.env.SPIKE48_ENTRY || 'index.html')).href;
const page=await browser.newPage({viewport:{width:1280,height:900},reducedMotion:'reduce'});
const errors=[];
page.on('pageerror',error=>errors.push(error.message));
await page.goto(base);
await page.getByRole('button',{name:'两边各取走一半'}).click();
await page.getByRole('button',{name:'换第 1 个苹果'}).click();
assert.match(await page.locator('#scale-status').textContent(),/2 个苹果和3 根黄瓜.*平衡/);
await page.screenshot({path:path.join(__dirname,'balance.png')});
await page.getByRole('button',{name:'清空右盘，我来试'}).click();
const cuke=page.getByRole('button',{name:'加一根黄瓜'});
await cuke.dragTo(page.locator('#right'));
assert.match(await page.locator('#scale-status').textContent(),/右盘 1 根黄瓜/);
await page.getByRole('button',{name:'看看孩子可以怎么问'}).click();
assert.match(await page.locator('#feedback').textContent(),/我已经放了 1 根/);
await page.getByRole('button',{name:'取下一根黄瓜'}).click();
assert.match(await page.locator('#scale-status').textContent(),/空着/);
await cuke.click();
for(let i=1;i<9;i++) await cuke.press('Enter');
assert.match(await page.locator('#scale-status').textContent(),/9 根黄瓜.*平衡/);
await cuke.click();
assert.match(await page.locator('#scale-status').textContent(),/10 根黄瓜.*右边重/);
await page.getByRole('button',{name:'取下一根黄瓜'}).click();
await page.getByRole('button',{name:'我想好了'}).click();
await page.getByRole('textbox',{name:'变化题答案'}).fill('6');
await page.getByRole('button',{name:'试试',exact:true}).click();
assert.match(await page.locator('#transfer [role=status]').textContent(),/数字答对/);
console.log('07: same-weight exchange, drag exactly once, undo, click, keyboard, contextual example and transfer passed');
await page.getByRole('link',{name:'05 彩铅工作室'}).click();
const pencil=(color)=>page.getByRole('button',{name:new RegExp('^'+color+'色铅笔')});
await pencil('红').click();
await pencil('橙').click();
await pencil('红').click();
assert.match(await page.locator('#count').textContent(),/1 种/);
assert.match(await page.locator('#feedback').textContent(),/同一对/);
for (let a=0;a<6;a++){
  await page.getByRole('button',{name:'放回桌上'}).click();
  await pencil('红橙黄绿青蓝紫'[a]).click();
  await page.getByRole('button',{name:'固定第一支，再找搭档'}).click();
  for(let b=a+1;b<7;b++) await pencil('红橙黄绿青蓝紫'[b]).click();
  if(a===1) await page.screenshot({path:path.join(__dirname,'pencils.png')});
}
assert.match(await page.locator('#count').textContent(),/21 种/);
await page.getByRole('textbox',{name:'总搭配数'}).fill('21');
await page.getByRole('button',{name:'一共有几种'}).click();
await page.getByRole('textbox',{name:'变化题答案'}).fill('10');
await page.getByRole('button',{name:'试试',exact:true}).click();
assert.match(await page.locator('#transfer [role=status]').textContent(),/数字答对/);
console.log('05: reversed order deduplication, 21 distinct pairs and transfer passed');
const mobile=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,isMobile:true,deviceScaleFactor:1,reducedMotion:'reduce'});
mobile.on('pageerror',error=>errors.push(error.message));
for(const route of ['balance','pencils']){
  await mobile.goto(base+'#'+route);
  assert(await mobile.locator('h1').isVisible());
  assert(await mobile.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
}
await mobile.getByRole('button',{name:'蓝色铅笔'}).tap();
await mobile.getByRole('button',{name:'紫色铅笔'}).tap();
assert.match(await mobile.locator('#count').textContent(),/1 种/);
await mobile.screenshot({path:path.join(__dirname,'pencils-mobile.png'),fullPage:true});
assert.deepEqual(errors,[]);
console.log('390px touch viewport: both scenes fit, tap works, no page errors');
} finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});



