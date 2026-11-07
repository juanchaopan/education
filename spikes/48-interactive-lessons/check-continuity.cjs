
const {chromium}=require(process.env.SPIKE48_PLAYWRIGHT);
const assert=require('node:assert/strict');
const path=require('node:path');
const base='http://127.0.0.1:4849';
(async()=>{
const browser=await chromium.launch({executablePath:process.env.SPIKE48_CHROME});
try{
 async function open(route,opts={}){
   const page=await browser.newPage({viewport:{width:1360,height:765},...opts});
   const errors=[];page.on('pageerror',error=>errors.push(error.message));
   assert.equal((await page.goto(base+'/'+route)).status(),200);
   await page.getByRole('button',{name:/进入|开始短片/}).click();
   return {page,errors};
 }
 async function drag(page,src,dest){
   const a=await src.boundingBox(),b=await dest.boundingBox();
   assert(a&&b);
   await page.mouse.move(a.x+a.width/2,a.y+a.height/2);
   await page.mouse.down();
   await page.mouse.move(b.x+b.width/2,b.y+b.height/2,{steps:9});
   await page.mouse.up();
 }
 async function rail(){
   const {page,errors}=await open('rail');
   await page.evaluate(()=>{
     window.original={track:tracks,M:$('carM'),N:$('carN'),ruler:$('distanceObject'),time:$('time')};
     player.playbackRate=4;player.addEventListener('playing',()=>{player.playbackRate=4;});
   });
   const active=page.locator('[data-object].active .hit');
   await active.click();
   const slider=page.getByRole('slider');
   await slider.fill('16');
   assert.equal(await slider.inputValue(),'6');
   await page.locator('#guide').click();
   await page.waitForFunction(()=>mode==='teach'&&!busy);
   assert.equal(await slider.inputValue(),'0');
   for(const [i,t] of [[0,'1'],[1,'6'],[2,'14'],[3,'14'],[4,'14']]){
     await active.click();
     await page.waitForFunction(n=>step===n&&!busy || n===5&&mode==='review'&&!busy,i+1);
     assert.equal(await slider.inputValue(),t);
     assert(await page.evaluate(()=>Object.values(window.original).every(el=>el.isConnected)));
     if(i===1)await page.screenshot({path:path.join(__dirname,'rail-one-diagram.png')});
   }
   assert.match(await page.locator('#ledger').textContent(),/速度 × 时间.*2t.*1t.*10 − t.*\|10 − t\|＝4/s);
   await page.getByRole('button',{name:'看 6 秒'}).click();
   await page.waitForFunction(()=>reviewed.has(6));
   await page.getByRole('button',{name:'看 14 秒'}).click();
   await page.waitForFunction(()=>reviewed.has(14));
   assert(await page.evaluate(()=>original.track===tracks&&original.M===$('carM')&&original.N===$('carN')&&original.ruler===$('distanceObject')));
   assert.deepEqual(errors,[]);
   console.log('Rail: same SVG, both vehicle nodes, same ruler and timeline stayed connected while building the entire equation and reviewing both times.');
   await page.close();
 }
 async function pencil(){
   const {page,errors}=await open('pencils');
   const get=i=>page.locator('[data-pencil="'+i+'"]');
   const target=s=>page.locator('[data-slot="'+s+'"]');
   await drag(page,await get(0).waitFor().then(()=>get(0)),target('anchor'));
   await get(1).waitFor();
   await drag(page,get(1),target('partner'));
   await page.waitForFunction(()=>caption.textContent===lines.redOrange&&!player.paused);
   assert.equal(await get(2).count(),0);
   assert.equal(await page.evaluate(()=>work.join(',')),'1');
   await page.evaluate(()=>{
     window.earlyYellow=false;
     const obs=new MutationObserver(()=>{
       if(caption.textContent===lines.redOrange&&document.querySelector('[data-pencil="2"]'))window.earlyYellow=true;
     });
     obs.observe(document.getElementById('world'),{childList:true,subtree:true});
   });
   await get(2).waitFor();
   assert(await page.evaluate(()=>caption.textContent===lines.yellowNext&&!player.paused&&!window.earlyYellow));
   assert.deepEqual(errors,[]);
   console.log('Pencils: at natural speech rate, red/orange stayed visible during its whole line and yellow was highlighted only as the yellow cue started.');
   await page.close();
 }
 await Promise.all([rail(),pencil()]);
 const mobile=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
 await mobile.goto(base+'/rail');
 await mobile.getByRole('button',{name:'开始短片'}).tap();
 await mobile.evaluate(()=>{player.playbackRate=4;player.addEventListener('playing',()=>{player.playbackRate=4;});});
 await mobile.locator('[data-object].active .hit').tap();
 assert(await mobile.getByRole('slider').isVisible());
 assert(await mobile.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 console.log('Rail: narrow-screen start and ruler tap passed.');
} finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});


