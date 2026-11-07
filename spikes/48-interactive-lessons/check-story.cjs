
const {chromium}=require(process.env.SPIKE48_PLAYWRIGHT);
const {pathToFileURL}=require('node:url');
const path=require('node:path');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.SPIKE48_CHROME});
 try{
 const url=pathToFileURL(path.join(__dirname,'garden-story.html')).href;
 const page=await browser.newPage({viewport:{width:1360,height:765},reducedMotion:'reduce'});
 const errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(url);
 await page.screenshot({path:path.join(__dirname,'story-opening.png')});
 await page.getByRole('button',{name:'进入菜园小剧场'}).click();
 await page.waitForFunction(()=>player.currentTime>.15 && player.duration>1);
 assert.equal(await page.locator('#film').getAttribute('data-shot'),'leaves');
 assert.equal(await page.locator('[data-part="exchange"], [data-part="bundle"]').count(),0);
 await page.waitForFunction(()=>lastLine==='question',{timeout:15000});
 await page.screenshot({path:path.join(__dirname,'story-first-shot.png')});
 const drag=async(source,target)=>{
  const s=await source.boundingBox(),d=await target.boundingBox();
  assert(s&&d);
  await page.mouse.move(s.x+s.width/2,s.y+s.height/2);
  await page.mouse.down();
  await page.mouse.move(d.x+d.width/2,d.y+d.height/2,{steps:10});
  await page.mouse.up();
 };
 await drag(page.locator('[data-part="leaf"]').first(),page.locator('[data-place="basket"]'));
 assert.equal(await page.locator('#film').getAttribute('data-shot'),'apples');
 for(let i=0;i<3;i++) await drag(page.locator('[data-part="apple"]').last(),page.locator('[data-place="basket"]'));
 await page.waitForFunction(()=>shot==='exchange');
 assert.equal(await page.locator('[data-part="bundle"]').count(),0);
 await page.waitForTimeout(340);
 await page.locator('[data-part="exchange"]').click();
 await page.screenshot({path:path.join(__dirname,'story-exchange.png')});
 await page.waitForFunction(()=>shot==='trial');
 for(let i=0;i<3;i++) await drag(page.locator('[data-part="bundle"]'),page.locator('[data-place="pan"]'));
 await page.waitForFunction(()=>shot==='formula');
 for(const symbol of ['3','×','3','＝','9']) await drag(page.locator('[data-place="bank"]').getByRole('button',{name:symbol,exact:true}).first(),page.locator('[data-place="line"]'));
 assert.equal(await page.locator('#film').getAttribute('data-shot'),'end');
 await page.screenshot({path:path.join(__dirname,'story-ending.png')});
 assert.deepEqual(errors,[]);
 console.log('Opening narration advanced through distinct clips, each shot waited for its action, no future props in opening, full drag journey and equation passed.');
 const mobile=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,isMobile:true,reducedMotion:'reduce'});
 await mobile.goto(url);
 await mobile.getByRole('button',{name:'进入菜园小剧场'}).tap();
 await mobile.waitForFunction(()=>player.currentTime>.2);
 await mobile.screenshot({path:path.join(__dirname,'story-mobile.png')});
 const cdp=await mobile.context().newCDPSession(mobile);
 const s=await mobile.locator('[data-part="leaf"]').first().boundingBox();
 const d=await mobile.locator('[data-place="basket"]').boundingBox();
 const point=(o)=>({x:o.x+o.width/2,y:o.y+o.height/2});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[point(s)]});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[point(d)]});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 assert.equal(await mobile.locator('#film').getAttribute('data-shot'),'apples');
 console.log('Phone-width touch drag and local audio playback passed.');
 } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});

