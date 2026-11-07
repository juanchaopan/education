
const {chromium}=require(process.env.SPIKE48_PLAYWRIGHT);
const path=require('node:path'),assert=require('node:assert/strict');
const url='http://127.0.0.1:4849/rail';
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.SPIKE48_CHROME});
 try{
  const launch=async opts=>{
   const page=await browser.newPage(opts);
   assert.equal((await page.goto(url)).status(),200);
   await page.getByRole('button',{name:'开始短片'})[opts.hasTouch?'tap':'click']();
   await page.evaluate(()=>{voice.playbackRate=4;voice.addEventListener('playing',()=>{voice.playbackRate=4;});});
   await page.waitForFunction(()=>ready);
   return page;
  };
  const page=await launch({viewport:{width:1360,height:765}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  assert.equal(await page.locator('.axis-label,#clock,#mathM,#mathN,#speedM,#speedN').count(),0);
  const scale=await page.evaluate(()=>diagram.getScreenCTM().a);
  const car=page.locator('#carM .car-hit');
  const hold=async seconds=>{
   const b=await car.boundingBox();
   const x=b.x+b.width*.42,y=b.y+b.height*.48;
   await page.mouse.move(x,y);await page.mouse.down();
   await page.mouse.move(x+seconds*35*scale,y,{steps:5});
   return {x,y};
  };
  const first=await hold(16);
  assert(await page.evaluate(()=>time===6&&locked&&drag.blocked));
  assert.equal(await page.locator('#gapCells rect').count(),4);
  assert.match(await page.locator('#formulaMain').textContent(),/10 − t ＝ 4/);
  await page.screenshot({path:path.join(__dirname,'rail-spatial-first-stop.png')});
  await page.waitForFunction(()=>!locked);
  await page.mouse.move(first.x+16.3*35*scale,first.y);
  assert(await page.evaluate(()=>time===6&&drag.blocked));
  await page.mouse.up();
  await hold(10);
  assert(await page.evaluate(()=>time===14&&locked&&drag.blocked));
  assert.equal(await page.locator('#gapCells rect').count(),4);
  assert.match(await page.locator('#formulaMain').textContent(),/\|10 − t\| ＝ 4/);
  await page.mouse.up();
  await page.waitForFunction(()=>!locked);
  await page.locator('#reset').click();
  await page.waitForFunction(()=>time===0);
  await hold(11);
  assert(await page.evaluate(()=>time===6&&locked));
  await page.mouse.up();
  assert.deepEqual(errors,[]);
  console.log('Desktop: numeric ruler and numeric readouts removed; fast drag stopped at six, held gesture could not pass after narration, new drag stopped at fourteen, four visual cells on both, repeat after reset stopped again.');
  const mobile=await launch({viewport:{width:390,height:844},hasTouch:true,isMobile:true,reducedMotion:'reduce'});
  const cdp=await mobile.context().newCDPSession(mobile);
  const b=await mobile.locator('#carM .car-hit').boundingBox();
  const x=b.x+b.width*.45,y=b.y+b.height*.5;
  const ratio=await mobile.evaluate(()=>diagram.getScreenCTM().a);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+13*35*ratio,y}]});
  await mobile.waitForFunction(()=>time===6&&drag?.blocked);
  assert.equal(await mobile.locator('#gapCells rect').count(),4);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  assert(await mobile.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  console.log('Mobile: fast touch drag also stopped at first four-cell gap without a precision target.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});

