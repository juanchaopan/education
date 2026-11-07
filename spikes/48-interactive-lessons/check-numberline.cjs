const {chromium}=require(process.env.SPIKE48_PLAYWRIGHT);
const {pathToFileURL}=require('node:url');
const path=require('node:path');
const assert=require('node:assert/strict');
(async()=>{
const browser=await chromium.launch({executablePath:process.env.SPIKE48_CHROME});
try {
const url=pathToFileURL(path.join(__dirname,'numberline.html')).href;
const page=await browser.newPage({viewport:{width:1200,height:940}});
const errors=[];
page.on('pageerror',error=>errors.push(error.message));
await page.goto(url);
const time=page.getByRole('slider');
const set=(value)=>time.fill(String(value));
const mark=()=>page.getByRole('button',{name:'标记这个时刻'}).click();
await page.getByRole('button',{name:'打开距离尺'}).click();
await set(10);
assert.match(await page.locator('#track').getAttribute('aria-label'),/M 在 19，N 在 19，相距 0/);
await mark();
assert.match(await page.locator('#marks').textContent(),/暂无/);
await set(6);await mark();await mark();
assert.match(await page.locator('#marks').textContent(),/6 秒$/);
assert.match(await page.locator('#track').getAttribute('aria-label'),/M 在 11，N 在 15，相距 4/);
await set(14);await mark();
assert.match(await page.locator('#marks').textContent(),/6 秒、14 秒/);
assert.match(await page.locator('#track').getAttribute('aria-label'),/M 在 27，N 在 23，相距 4/);
await page.screenshot({path:path.join(__dirname,'numberline.png')});
await page.getByRole('button',{name:'试一道变化题'}).click();
await set(3);await mark();
await set(7);await mark();
assert.match(await page.locator('#marks').textContent(),/3 秒、7 秒/);
await page.getByRole('button',{name:'播放',exact:true}).click();
await page.waitForFunction(()=>Number(document.getElementById('time').value)>7);
await page.getByRole('button',{name:'暂停',exact:true}).click();
assert.deepEqual(errors,[]);
const mobile=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
await mobile.goto(url);
assert(await mobile.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
console.log('Original 6 and 14, duplicate and incorrect stamps, collision, distances and order, transfer 3 and 7, play/pause, 390px layout passed');
} finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});

