
const {chromium}=require(process.env.SPIKE48_PLAYWRIGHT);
const path=require('node:path');
const assert=require('node:assert/strict');
const base='http://127.0.0.1:4849';
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.SPIKE48_CHROME});
 try{
 const page=await browser.newPage({viewport:{width:1360,height:765},reducedMotion:'reduce'});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 for(const [route,phase] of [['garden','leaves'],['pencils','chooseAnchor']]){
   const response=await page.goto(base+'/'+route);
   assert.equal(response.status(),200);
   await page.getByRole('button',{name:/进入/}).click();
   assert.equal(await page.locator('#film').getAttribute('data-shot'),phase);
   await page.waitForFunction(()=>player.currentTime>.2 && player.duration>1);
   console.log(route+': visible entry click and audio passed over HTTP');
 }
 await page.goto(base+'/garden');
 await page.mouse.click(50,150);
 assert.equal(await page.locator('#film').getAttribute('data-shot'),'leaves');
 console.log('Garden: clicking outside the start button also starts');
 const response=await page.goto(base+'/rail');
 assert.equal(response.status(),200);
 await page.getByRole('button',{name:'开始短片'}).click();
 await page.waitForFunction(()=>player.currentTime>.15 && player.duration>1);
 assert.equal(await page.locator('#rail').getAttribute('data-scene'),'measure');
 assert.equal(await page.locator('#timeline').isVisible(),false);
 await page.getByRole('button',{name:'距离尺 10 格'}).click();
 const slider=page.getByRole('slider',{name:'经过时间'});
 await slider.fill('10');
 assert.equal(await page.getByRole('button',{name:'距离尺 0 格'}).count(),1);
 await slider.fill('6');
 await page.getByRole('button',{name:'距离尺 4 格'}).click();
 assert.match(await page.locator('#marks').textContent(),/6 秒/);
 await page.screenshot({path:path.join(__dirname,'rail-discovery.png')});
 await slider.fill('14');
 await page.getByRole('button',{name:'距离尺 4 格'}).click();
 await page.waitForFunction(()=>scene==='forge',{timeout:17000});
 assert.match(await page.locator('#forge h2').textContent(),/带方向/);
 const drag=async(value,to)=>{
   const source=page.locator('.bank .tile').filter({hasText:value}).first();
   const dest=page.locator('[data-target="'+to+'"]');
   const a=await source.boundingBox(),b=await dest.boundingBox();
   assert(a&&b,value+' to '+to);
   await page.mouse.move(a.x+a.width/2,a.y+a.height/2);
   await page.mouse.down();
   await page.mouse.move(b.x+b.width/2,b.y+b.height/2,{steps:8});
   await page.mouse.up();
 };
 await drag('10','s0');await drag('＋','s1');await drag('t','s2');
 assert.equal(await page.evaluate(()=>stage),'difference');
 await drag('−','s1');
 assert.equal(await page.evaluate(()=>stage),'absolute');
 await drag('|','left');await drag('|','right');
 assert.equal(await page.evaluate(()=>stage),'goal');
 await page.screenshot({path:path.join(__dirname,'rail-equation.png')});
 await drag('＝','eq');await drag('4','goal');
 assert.equal(await page.evaluate(()=>scene),'proof');
 await drag('−4','before');
 assert.match(await page.locator('#forge [role=status]').textContent(),/哪辆车在前/);
 await drag('＋4','before');await drag('−4','after');
 assert.equal(await page.evaluate(()=>scene),'end');
 assert.match(await page.locator('#forge').textContent(),/t＝6 秒/);
 assert.match(await page.locator('#forge').textContent(),/t＝14 秒/);
 await page.screenshot({path:path.join(__dirname,'rail-proof.png')});
 const mobile=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
 await mobile.goto(base+'/rail');
 await mobile.getByRole('button',{name:'开始短片'}).tap();
 await mobile.waitForFunction(()=>player.currentTime>.15);
 await mobile.getByRole('button',{name:'距离尺 10 格'}).tap();
 assert.equal(await mobile.getByRole('slider',{name:'经过时间'}).isVisible(),true);
 assert(await mobile.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 assert.deepEqual(errors,[]);
 console.log('Rail: audio, initial distance, overlap, two marks, incorrect equation correction, drag assembly and both signed branches passed. 390px touch start and ruler passed.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});

