
const {chromium}=require(process.env.SPIKE48_PLAYWRIGHT);
const path=require('node:path'),assert=require('node:assert/strict');
const url='http://127.0.0.1:4849/rail';
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.SPIKE48_CHROME});
 try{
 const page=await browser.newPage({viewport:{width:1360,height:765}});
 const errors=[];page.on('pageerror',err=>errors.push(err.message));
 assert.equal((await page.goto(url)).status(),200);
 assert.match(await page.locator('.setup').textContent(),/每秒走 2 格.*每秒走 1 格.*中点 M、N 相距 4 格/s);
 await page.getByRole('button',{name:'开始短片'}).click();
 assert.match(await page.locator('#problemQuestion').textContent(),/M 和 N 什么时候相距 4 格/);
 assert.equal(await page.locator('#carM').getAttribute('aria-disabled'),'true');
 assert.equal(await page.locator('#pushArrow').isVisible(),false);
 await page.waitForFunction(()=>rail.dataset.intro==='question');
 assert.match(await page.locator('#formulaExplain').textContent(),/两个中点/);
 await page.waitForFunction(()=>rail.dataset.intro==='origin');
 assert.match(await page.locator('#formulaMain').textContent(),/9 − \(−1\)＝10/);
 assert.equal(await page.locator('#pushArrow').isVisible(),false);
 await page.screenshot({path:path.join(__dirname,'rail-question-intro.png')});
 await page.waitForFunction(()=>ready);
 assert.equal(await page.locator('#pushArrow').isVisible(),true);
 console.log('Intro at natural speed: question visible before start, M and N explained, initial gap derived, then car controls enabled.');
 await page.waitForFunction(()=>voice.currentTime>.15);
 assert.equal(await page.locator('input[type=range]').count(),0);
 await page.locator('#carM .car-hit').click({position:{x:25,y:42}});
 await page.waitForFunction(()=>time===1);
 assert.match(await page.locator('#mathM').textContent(),/2 × 1 ＝ 2/);
 await page.locator('#reset').click();
 await page.waitForFunction(()=>time===0);
 await page.evaluate(()=>{window.same=[diagram,$('carM'),$('carN'),$('formulaMain')];});
 const start=await page.locator('#carM .car-hit').boundingBox();
 const anchor={x:start.x+start.width*.46,y:start.y+start.height*.49};
 const scale=await page.evaluate(()=>diagram.getScreenCTM().a);
 const go=seconds=>page.mouse.move(anchor.x+seconds*35*scale,anchor.y,{steps:15});
 await page.mouse.move(anchor.x,anchor.y);await page.mouse.down();
 await go(6);
 assert.match(await page.locator('#mathM').textContent(),/2 × 6 ＝ 12/);
 assert.match(await page.locator('#mathN').textContent(),/1 × 6 ＝ 6/);
 assert.match(await page.locator('#rulerText').textContent(),/距离 4/);
 assert.match(await page.locator('#formulaExplain').textContent(),/追回 6 格，剩下 4 格/);
 await page.screenshot({path:path.join(__dirname,'rail-live-six.png')});
 await go(14);
 assert.match(await page.locator('#formulaMain').textContent(),/\|10 − 14\|＝4/);
 assert.match(await page.locator('#formulaExplain').textContent(),/黄车在前，差是 −4/);
 assert.match(await page.locator('#observations').textContent(),/6 秒、14 秒/);
 await page.screenshot({path:path.join(__dirname,'rail-live-fourteen.png')});
 await page.mouse.up();
 await page.locator('#reset').click();
 await page.waitForFunction(()=>time===0);
 assert.match(await page.locator('#formulaMain').textContent(),/\|10 − 0\|＝10/);
 assert(await page.evaluate(()=>window.same.every(el=>el.isConnected)));
 await page.locator('#carM').focus();
 await page.keyboard.press('ArrowRight');await page.waitForFunction(()=>time===1);
 assert.deepEqual(errors,[]);
 console.log('Desktop: single tap advanced one second, a held car drag kept car locations and all three calculations in sync before release, reached 6 and 14, reset, keyboard replay and persistent diagram passed.');
 const mobile=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,isMobile:true,reducedMotion:'reduce'});
 await mobile.goto(url);await mobile.getByRole('button',{name:'开始短片'}).tap();
 await mobile.evaluate(()=>{voice.playbackRate=4;voice.addEventListener('playing',()=>{voice.playbackRate=4;});});
 await mobile.waitForFunction(()=>ready);
 const client=await mobile.context().newCDPSession(mobile);
 const b=await mobile.locator('#carM .car-hit').boundingBox();
 const x=b.x+b.width*.45,y=b.y+b.height*.5;
 const a=await mobile.evaluate(()=>diagram.getScreenCTM().a);
 await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
 for(let i=1;i<=5;i++)await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+i*35*a,y}]});
 await mobile.waitForFunction(()=>time===5);
 assert.match(await mobile.locator('#mobileExplain').textContent(),/追回 5 格/);
 await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 assert(await mobile.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await mobile.screenshot({path:path.join(__dirname,'rail-drive-mobile.png')});
 console.log('Mobile: direct touch on the vehicle moved both cars and updated the displayed calculation while touch was held.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});



