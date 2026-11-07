
const {chromium}=require(process.env.SPIKE48_PLAYWRIGHT);
const {pathToFileURL}=require('node:url');
const path=require('node:path');
(async()=>{
 const {prepareLessonCapture,recordLesson}=await import(pathToFileURL(process.env.LESSON_CAPTURE));
 const browser=await chromium.launch({executablePath:process.env.SPIKE48_CHROME});
 try{
  const page=await browser.newPage({viewport:{width:840,height:480}});
  await prepareLessonCapture(page);
  await page.goto('http://127.0.0.1:4849/pencils');
  const evidence=await recordLesson(page,path.join(__dirname,'recorder-smoke'),async()=>{
    await page.getByRole('button',{name:/进入/}).click();
    await page.waitForFunction(()=>player.currentTime>1);
    await page.waitForTimeout(1200);
  });
  console.log(evidence);
 }finally{await browser.close();}
})().catch(err=>{console.error(err);process.exitCode=1;});

