
const {chromium}=require(process.env.SPIKE48_PLAYWRIGHT);
const {pathToFileURL}=require('node:url');
const path=require('node:path');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.SPIKE48_CHROME});
 try{
 const url=pathToFileURL(path.join(__dirname,'pencil-story.html')).href;
 const page=await browser.newPage({viewport:{width:1360,height:765},reducedMotion:'reduce'});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(url);
 await page.getByRole('button',{name:'进入彩铅小剧场'}).click();
 await page.waitForFunction(()=>player.currentTime>.15 && player.duration>1);
 const drag=async(index,slot)=>{
   const source=await page.locator('[data-pencil="'+index+'"]').boundingBox();
   const dest=await page.locator('[data-slot="'+slot+'"]').boundingBox();
   assert(source&&dest,'active source and slot');
   await page.mouse.move(source.x+source.width/2,source.y+source.height/2);
   await page.mouse.down();
   await page.mouse.move(dest.x+dest.width/2,dest.y+dest.height/2,{steps:10});
   await page.mouse.up();
 };
 await drag(0,'anchor');
 await drag(1,'partner');
 assert.deepEqual(await page.evaluate(()=>[...work]),[1]);
 assert.equal(await page.locator('[data-pencil="2"]').count(),1);
 assert.equal(await page.locator('[data-pencil="0"]').count(),0);
 await page.screenshot({path:path.join(__dirname,'pencil-story-red.png')});
 await drag(2,'partner');
 await page.waitForFunction(()=>row===1&&phase==='pair',{timeout:19000});
 assert.deepEqual(await page.evaluate(()=>completed[0]),[1,2,3,4,5,6]);
 assert.equal(await page.locator('.already').count(),1);
 assert.equal(await page.locator('[data-pencil="0"]').count(),0);
 await page.screenshot({path:path.join(__dirname,'pencil-story-orange.png')});
 for(let i=1;i<6;i++){
   await drag(i+1,'partner');
   if(i<5) await page.waitForFunction(n=>row===n&&phase==='pair',i+1,{timeout:17000});
 }
 await page.waitForFunction(()=>phase==='tally');
 const history=await page.evaluate(()=>completed.map((items,i)=>items.map(j=>[i,j])));
 assert.deepEqual(history.map(items=>items.length),[6,5,4,3,2,1]);
 assert.equal(new Set(history.flat().map(pair=>pair.join(','))).size,21);
 for(let i=0;i<6;i++) await page.locator('[data-tally="'+i+'"]').click();
 assert.match(await page.locator('#film').textContent(),/一共 21 种/);
 await page.screenshot({path:path.join(__dirname,'pencil-story-count.png')});
 assert.deepEqual(errors,[]);
 console.log('Pencil story: Mandarin played, manual red/orange and red/yellow, automatic rest, visible skip, six rows 6-5-4-3-2-1, 21 unique, tally passed.');
 const mobile=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,isMobile:true,reducedMotion:'reduce'});
 await mobile.goto(url);
 await mobile.getByRole('button',{name:'进入彩铅小剧场'}).tap();
 const cdp=await mobile.context().newCDPSession(mobile);
 const a=await mobile.locator('[data-pencil="0"]').boundingBox(),b=await mobile.locator('[data-slot="anchor"]').boundingBox();
 const point=(o)=>({x:o.x+o.width/2,y:o.y+o.height/2});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[point(a)]});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[point(b)]});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 assert.equal(await mobile.evaluate(()=>phase),'pair');
 console.log('Pencil story: touch drag on 390px passed.');
 } finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});

