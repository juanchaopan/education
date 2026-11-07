
const {chromium}=require(process.env.SPIKE48_PLAYWRIGHT);
const assert=require('node:assert/strict'),path=require('node:path');
const url='http://127.0.0.1:4849/rail';
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.SPIKE48_CHROME});
 try{
  const start=async options=>{
   const p=await browser.newPage(options);
   assert.equal((await p.goto(url)).status(),200);
   await p.getByRole('button',{name:'开始短片'})[options.hasTouch?'tap':'click']();
   await p.evaluate(()=>{voice.playbackRate=4;voice.addEventListener('playing',()=>{voice.playbackRate=4;});});
   await p.waitForFunction(()=>ready);
   return p;
  };
  const page=await start({viewport:{width:1360,height:765}});
  const errors=[];page.on('pageerror',err=>errors.push(err.message));
  const cart=page.locator('#carM .car-hit');
  const unlock=()=>page.waitForFunction(()=>!locked);
  async function over(to){
    const b=await cart.boundingBox();
    await page.mouse.move(b.x+b.width*.43,b.y+b.height*.5);await page.mouse.down();
    await page.mouse.move(Math.min(1260,b.x+520),b.y+b.height*.5,{steps:5});
    assert.equal(await page.evaluate(()=>time),to);
    assert(await page.evaluate(()=>drag.blocked&&locked));
    await page.mouse.up();
  }
  assert.equal(await page.locator('#originM,#originN,.origin-coordinate').count(),0);
  assert.equal(await page.locator('#startCells rect').count(),10);
  await over(1);
  assert.equal(await page.locator('.example-yellow').count(),2);
  assert.equal(await page.locator('.example-blue').count(),1);
  assert.equal(await page.locator('#startCells .recovered').count(),1);
  assert.doesNotMatch(await page.locator('#formulaMain').textContent(),/10 − t/);
  await page.screenshot({path:path.join(__dirname,'rail-reasoning-one.png')});
  await unlock();await over(2);await unlock();
  assert.equal(await page.locator('#startCells .recovered').count(),2);
  assert.match(await page.locator('#formulaExplain').textContent(),/走了几秒叫 t/);
  assert.doesNotMatch(await page.locator('#formulaMain').textContent(),/10 − t/);
  assert.equal(await page.locator('#pushArrow').isVisible(),false);
  await page.locator('#subtractTarget.active rect').click();
  assert.match(await page.locator('#formulaMain').textContent(),/起初相隔 − 已经追回 ＝ 10 − t/);
  await page.screenshot({path:path.join(__dirname,'rail-reasoning-subtract.png')});
  await unlock();await over(6);
  assert.equal(await page.locator('#gapCells rect').count(),4);
  await unlock();await over(11);await unlock();
  assert(await page.locator('#direction').isVisible());
  assert.doesNotMatch(await page.locator('#formulaMain').textContent(),/\|/);
  await page.locator('#distanceTarget.active rect').click();
  assert.match(await page.locator('#formulaMain').textContent(),/\|10 − t\|/);
  assert.equal(await page.locator('#direction').isVisible(),false);
  await unlock();await over(14);
  assert.equal(await page.getByRole('button',{name:'结束本题'}).isVisible(),false);
  await unlock();
  assert.equal(await page.locator('#gapCells rect').count(),4);
  assert.equal(await page.locator('#pushArrow').isVisible(),false);
  await page.mouse.move(870,230);await page.mouse.down();await page.mouse.move(1250,230);await page.mouse.up();
  assert.equal(await page.evaluate(()=>time),14);
  await page.getByRole('button',{name:'结束本题'}).click();
  assert.equal(await page.locator('#guidance').textContent(),'本题结束');
  assert.equal(await page.getByRole('button',{name:'结束本题'}).isVisible(),false);
  assert.deepEqual(errors,[]);
  console.log('Desktop: no starting coordinates, 10 physical cells, two successive one-cell gains, t before 10−t, signed gap before absolute value, both four-cell stops and explicit completion.');
  const mobile=await start({viewport:{width:390,height:844},hasTouch:true,isMobile:true,reducedMotion:'reduce'});
  const cdp=await mobile.context().newCDPSession(mobile);
  const b=await mobile.locator('#carM .car-hit').boundingBox();
  const x=b.x+b.width*.42,y=b.y+b.height*.48;
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+165,y}]});
  await mobile.waitForFunction(()=>time===1&&drag.blocked);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  console.log('Mobile: rapid touch drag held at the first one-second comparison.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});

