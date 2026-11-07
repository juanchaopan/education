
const {chromium}=require(process.env.SPIKE48_PLAYWRIGHT);
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.SPIKE48_CHROME});
 try{
 const page=await browser.newPage({viewport:{width:1280,height:1050},reducedMotion:'reduce'});
 const errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 const load=async(file,hash='')=>page.goto(pathToFileURL(path.join(__dirname,file)).href+hash);
 const drag=async(source,target)=>{
   await source.scrollIntoViewIfNeeded();
   await target.scrollIntoViewIfNeeded();
   const a=await source.boundingBox();
   const b=await target.boundingBox();
   await page.mouse.move(a.x+a.width/2,a.y+a.height/2);
   await page.mouse.down();
   await page.mouse.move(b.x+b.width*.77,b.y+b.height*.5,{steps:10});
   await page.mouse.up();
 };
 await load('preview-v2.html');
 await page.getByRole('button',{name:'听完整题目'}).click();
 await page.waitForFunction(()=>audio.currentTime>.2 && audio.duration>6);
 const scale=(index)=>page.locator('[data-machine="'+index+'"]');
 const pan=(index,side)=>scale(index).locator('[data-pan="'+side+'"]');
 const apple=pan(0,1).getByRole('button',{name:'苹果'});
 const leaf=pan(0,0).getByRole('button',{name:'青菜'});
 const tray=scale(0).locator('.tray');
 const spot=await pan(1,0).boundingBox();
 await page.mouse.move(spot.x+11,spot.y+11);
 await page.mouse.down();
 await page.mouse.move(spot.x+11,spot.y-14,{steps:5});
 assert.match(await scale(1).locator('.arm').getAttribute('style'),/rotate/);
 await page.mouse.up();
 assert.doesNotMatch(await scale(1).locator('.arm').getAttribute('style'),/rotate/);
 await drag(leaf.first(),tray);
 for(let i=0;i<3;i++) await drag(apple.first(),tray);
 assert.match(await scale(0).locator('.weigh-status').textContent(),/一样重/);
 assert.equal(await apple.count(),3);
 const cuke=scale(2).locator('.supply');
 for(let i=0;i<10;i++) {await drag(cuke,pan(2,1)); assert.equal(await pan(2,1).getByRole('button',{name:'黄瓜',exact:true}).count(),i+1,'cucumber '+(i+1));}
 assert.match(await scale(2).locator('.weigh-status').textContent(),/右边重/);
 await drag(pan(2,1).getByRole('button',{name:'黄瓜',exact:true}).first(),scale(2).locator('.tray'));
 assert.match(await scale(2).locator('.weigh-status').textContent(),/一样重/);
 for(const value of ['3','×','3','＝','9']) await drag(page.locator('.tile-tray').getByRole('button',{name:value,exact:true}).first(),page.locator('.tile-line'));
 assert.match(await page.locator('#equation-note').textContent(),/和秤上的画面一样/);
 await page.screenshot({path:path.join(__dirname,'balance-v2.png')});
 await load('preview-v2.html','#pencils');
 await page.getByRole('button',{name:'听完整题目'}).click();
 await page.waitForFunction(()=>audio.currentTime>.15 && audio.duration>6);
 const pencil=color=>page.locator('.pencils').getByRole('button',{name:color+'色铅笔'});
 const slot=(i)=>page.locator('.slot[data-place="'+i+'"]');
 await drag(pencil('红'),slot(0));await drag(pencil('橙'),slot(1));
 assert.equal(await page.locator('#count').textContent(),'1');
 await drag(slot(0).getByRole('button',{name:'红色铅笔'}),slot(1));
 assert.equal(await page.locator('#count').textContent(),'1');
 assert.match(await page.locator('#feedback').textContent(),/还是同一对/);
 await drag(pencil('黄'),slot(1));
 assert.equal(await page.locator('#count').textContent(),'2');
 await page.screenshot({path:path.join(__dirname,'pencils-v2.png')});
 await load('numberline-v2.html');
 await page.getByRole('button',{name:'听完整题目'}).click();
 await page.waitForFunction(()=>voice.currentTime>.15 && voice.duration>5);
 const time=page.getByRole('slider');
 const mark=()=>page.getByRole('button',{name:'标记这个距离：4'}).click();
 await time.fill('6');await mark();await time.fill('14');await mark();
 for(const symbol of ['|','10','−','t','|','＝','4']) {
   await drag(page.locator('.line-bank').getByRole('button',{name:symbol,exact:true}).first(),page.locator('.line-expression'));
 }
 assert.match(await page.locator('#formula [role=status]').textContent(),/这条方程说的是/);
 await page.screenshot({path:path.join(__dirname,'numberline-v2.png'),fullPage:true});
 await page.getByRole('button',{name:'试一道变化题'}).click();
 await time.fill('3');await mark();await time.fill('7');await mark();
 assert.match(await page.locator('#marks').textContent(),/3 秒、7 秒/);
 for(const symbol of ['|','10','−','2','×','t','|','＝','4']) {
   await drag(page.locator('.line-bank').getByRole('button',{name:symbol,exact:true}).first(),page.locator('.line-expression'));
 }
 assert.match(await page.locator('#formula [role=status]').textContent(),/这条方程说的是/);
 assert.deepEqual(errors,[]);
 console.log('Audio played from embedded MP3 in all three scenes. Pan tilt and return, direct food drag, pencil swap deduplication, garden expression, timeline and equation drag passed.');
 const mobile=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
 for(const hash of ['#balance','#pencils']){
   await mobile.goto(pathToFileURL(path.join(__dirname,'preview-v2.html')).href+hash);
   assert(await mobile.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 }
 const cdp=await mobile.context().newCDPSession(mobile);
 const a=await mobile.locator('.pencils').getByRole('button',{name:'红色铅笔'}).boundingBox();
 const b=await mobile.locator('.slot').first().boundingBox();
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:a.x+a.width/2,y:a.y+a.height/2}]});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:b.x+b.width/2,y:b.y+b.height/2}]});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 assert.equal(await mobile.locator('.slot').first().getByRole('button',{name:'红色铅笔'}).count(),1);
 await mobile.waitForFunction(()=>audio.currentTime>.15);
 console.log('390px scenes fit and touch drag placed the pencil and started the narration.');
 } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});



