
const {chromium}=require(process.env.SPIKE48_PLAYWRIGHT);
const assert=require('node:assert/strict');
const path=require('node:path');
const base='http://127.0.0.1:4849';
(async()=>{
const browser=await chromium.launch({executablePath:process.env.SPIKE48_CHROME});
try{
 async function setup(route){
   const page=await browser.newPage({viewport:{width:1360,height:765},reducedMotion:'reduce'});
   const errors=[];
   page.on('pageerror',error=>errors.push(error.message));
   assert.equal((await page.goto(base+'/'+route)).status(),200);
   await page.getByRole('button',{name:/进入|开始短片/}).click();
   return {page,errors};
 }
 async function drag(page,source,target){
   const a=await source.boundingBox(),b=await target.boundingBox();
   assert(a&&b);
   await page.mouse.move(a.x+a.width/2,a.y+a.height/2);
   await page.mouse.down();
   await page.mouse.move(b.x+b.width/2,b.y+b.height/2,{steps:8});
   await page.mouse.up();
 }
 async function garden(){
   const {page,errors}=await setup('garden');
   await page.evaluate(()=>{player.playbackRate=3;player.addEventListener('play',()=>{player.playbackRate=3;});});
   const state=shot=>page.waitForFunction(s=>film.dataset.shot===s,shot,{timeout:25000});
   await drag(page,page.locator('[data-part="leaf"]').first(),page.locator('[data-place="basket"]'));
   for(let i=0;i<3;i++)await drag(page,page.locator('[data-part="apple"]').last(),page.locator('[data-place="basket"]'));
   await state('exchange');await page.locator('[data-part="exchange"]').click();
   await state('bridge');
   for(let i=1;i<=3;i++){
     await page.locator('[data-part="replace"]').click();
     assert.equal(await page.evaluate(()=>replaced),i);
     const groups=await page.locator('g:has(> rect[stroke="#e4dea0"]) use[href="#cuke-sprite"]').count();
     assert.equal(groups,i*3);
   }
   await state('variation');
   await page.screenshot({path:path.join(__dirname,'garden-transfer.png')});
   for(let i=1;i<=3;i++)await page.locator('[data-part="replace"]').click();
   await state('end');
   assert.equal(await page.locator('g:has(> rect[stroke="#e4dea0"]) use[href="#cuke-sprite"]').count(),6);
   assert.equal(await page.locator('[data-symbol]').count(),0);
   assert.deepEqual(errors,[]);
   console.log('Garden: apple-to-cucumber bridge maintained visible groups and variation changed the group size without symbol dragging.');
   await page.close();
 }
 async function pencils(){
   const {page,errors}=await setup('pencils');
   await page.evaluate(()=>{
     window.voices=[];
     const speed=()=>{player.playbackRate=2;};
     player.addEventListener('playing',()=>{speed();window.voices.push(['play',caption.textContent]);});
     player.addEventListener('ended',()=>window.voices.push(['ended',caption.textContent]),true);
     player.addEventListener('abort',()=>window.voices.push(['abort',caption.textContent]));
     speed();
   });
   const pencil=i=>page.locator('[data-pencil="'+i+'"]');
   const dest=s=>page.locator('[data-slot="'+s+'"]');
   await drag(page,pencil(0),dest('anchor'));
   await drag(page,pencil(1),dest('partner'));
   await drag(page,pencil(2),dest('partner'));
   for(let i=1;i<6;i++){
     await page.waitForFunction(n=>row===n&&phase==='pair',i,{timeout:45000});
     await drag(page,pencil(i+1),dest('partner'));
   }
   await page.waitForFunction(()=>phase==='tally',null,{timeout:45000});
   const row=async i=>{
     const group=page.locator('[data-tally="'+i+'"]');
     const b=await group.boundingBox();
     await page.mouse.click(b.x+b.width*.80,b.y+b.height*.82);
   };
   await row(2);
   assert.equal(await page.locator('[data-tally="2"]').getAttribute('aria-pressed'),'true');
   await row(2);assert.equal(await page.evaluate(()=>counted.size),1);
   for(const i of [0,1,3,4,5])await row(i);
   await page.waitForFunction(()=>phase==='end',null,{timeout:25000});
   await page.waitForFunction(()=>player.ended);
   const events=await page.evaluate(()=>window.voices);
   const started=events.filter(([type])=>type==='play').map(([,line])=>line);
   const ended=events.filter(([type])=>type==='ended').map(([,line])=>line);
   assert(started.length>=10); console.log('Pencil audio events: '+started.length+' starts, '+ended.length+' ends');
   for(const line of started)assert(ended.includes(line),'audio must finish: '+line);
   assert.deepEqual(await page.evaluate(()=>completed.map(items=>items.length)),[6,5,4,3,2,1]);
   assert.deepEqual(errors,[]);
   console.log('Pencils: quick drags retained all started voice clips through ended; blank area of entire row was clickable; repeat did not increment; six rows completed.');
   await page.close();
 }
 async function rail(){
   const {page,errors}=await setup('rail');
   await page.evaluate(()=>{player.playbackRate=4;player.addEventListener('play',()=>{player.playbackRate=4;});});
   await page.getByRole('button',{name:'距离尺 10 格'}).click();
   const slider=page.getByRole('slider');
   await slider.fill('16');
   assert.equal(await slider.inputValue(),'6');
   assert.match(await page.locator('#marks').textContent(),/6 秒/);
   await page.locator('#guide').click();
   await page.waitForFunction(()=>marks.size===2);
   assert.equal(await slider.inputValue(),'14');
   const object=page.locator('.lesson-object[aria-disabled="false"]');
   await object.waitFor({timeout:45000});
   for(let i=0;i<7;i++){
     await object.click({timeout:25000});
     if(i===3)await page.screenshot({path:path.join(__dirname,'rail-derived-absolute.png')});
   }
   await page.waitForFunction(()=>stage===7);
   assert.match(await page.locator('#forge').textContent(),/10 − t ＝ 4，得到 t ＝ 6 秒/);
   assert.match(await page.locator('#forge').textContent(),/10 − t ＝ −4，得到 t ＝ 14 秒/);
   assert.equal(await page.locator('.tile,.socket').count(),0);
   assert.deepEqual(errors,[]);
   console.log('Rail: coarse slider jump auto-marked, guided path reached second mark, seven highlighted mathematical objects led through both equations without symbol drag.');
   await page.close();
 }
 if(process.env.SPIKE48_RAIL_ONLY==='1') await rail(); else await Promise.all([garden(),pencils(),rail()]);
}finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});



