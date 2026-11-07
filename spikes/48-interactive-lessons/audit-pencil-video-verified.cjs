
const {chromium}=require(process.env.SPIKE48_PLAYWRIGHT);
const {pathToFileURL}=require('node:url');
const {join}=require('node:path');
const fs=require('node:fs/promises'),assert=require('node:assert/strict');
const base='http://127.0.0.1:4849/pencils';
(async()=>{
 const {prepareLessonCapture,recordLesson}=await import(pathToFileURL(process.env.LESSON_CAPTURE));
 const browser=await chromium.launch({executablePath:process.env.SPIKE48_CHROME});
 try{
 const page=await browser.newPage({viewport:{width:1080,height:608}});
 const errors=[];page.on('pageerror',err=>errors.push(err.message));
 await prepareLessonCapture(page);
 await page.goto(base);
 const evidence=await recordLesson(page,join(__dirname,'pencil-video-verified'),async()=>{
   await page.evaluate(()=>{
    window.auditSteps=[];
    let last;
    const observer=new MutationObserver(()=>{
      const link=document.querySelector('.pair-link')?.dataset.link??'';
      const active=document.querySelector('[data-pencil]')?.dataset.pencil??'';
      const words=document.getElementById('caption').textContent;
      const phase=document.getElementById('film').dataset.shot;
      const key=[phase,link,active,words].join('/');
      if(last===key)return;
      last=key;window.auditSteps.push({at:(performance.timeOrigin+performance.now())/1000,phase,link,active,words});
    });
    observer.observe(document.getElementById('film'),{subtree:true,childList:true,attributes:true});
   });
   const source=i=>page.locator('[data-pencil="'+i+'"]');
   const slot=s=>page.locator('[data-slot="'+s+'"]');
   const drag=async (i,s,steps,wrong=false)=>{
     await source(i).waitFor();
     const a=await source(i).boundingBox(), b=await slot(s).boundingBox();
     await page.mouse.move(a.x+a.width/2,a.y+a.height*.39);await page.mouse.down();
     const x=wrong?25:b.x+b.width/2,y=wrong?120:b.y+b.height/2;
     if(steps<10)await page.mouse.move(x,y,{steps});
     else{
       const start={x:a.x+a.width/2,y:a.y+a.height*.39};
       for(let n=1;n<=steps;n++){await page.mouse.move(start.x+(x-start.x)*n/steps,start.y+(y-start.y)*n/steps);await page.waitForTimeout(35);}
     }
     await page.mouse.up();
   };
   await page.mouse.click(1000,180);
   await page.mouse.click(760,420);await page.mouse.click(860,260);
   await drag(0,'anchor',4,true);
   assert.equal(await source(0).count(),1);
   await drag(0,'anchor',4);
   await drag(1,'partner',3);
   await page.waitForFunction(()=>caption.textContent===lines.redOrange&&!player.paused);
   assert.equal(await source(2).count(),0);
   await page.mouse.click(677,239);await page.mouse.click(910,412);
   await source(2).waitFor();
   assert(await page.evaluate(()=>caption.textContent===lines.yellowNext));
   await drag(2,'partner',28);
   assert.equal(await page.locator('.pair-link').getAttribute('data-link'),'0,2');
   for(let i=1;i<6;i++){
     await page.waitForFunction(n=>row===n&&phase==='pair',i,{timeout:45000});
     if(i===1){await page.mouse.click(210,180);await page.mouse.click(868,422);}
     await drag(i+1,'partner',i%2?3:14);
   }
   await page.waitForFunction(()=>phase==='tally',null,{timeout:45000});
   for(const i of [0,0,1,2,3,4,5]){
     const b=await page.locator('[data-tally="'+i+'"]').boundingBox();
     await page.mouse.click(b.x+b.width*.78,b.y+b.height*.71);
   }
   await page.waitForFunction(()=>phase==='end'&&player.ended,{},{timeout:45000});
   assert.deepEqual(await page.evaluate(()=>completed.map(items=>items.length)),[6,5,4,3,2,1]);
   assert.deepEqual(errors,[]);
   const steps=await page.evaluate(()=>window.auditSteps);
   const red=steps.filter(s=>/^0,/.test(s.link)).map(s=>s.link);
   assert.deepEqual([...new Set(red)],['0,1','0,2','0,3','0,4','0,5','0,6']);
   await fs.writeFile(join(__dirname,'pencil-video-verified','scene-events.json'),JSON.stringify(steps,null,2));
   await page.waitForTimeout(850);
 });
 console.log('Recorded the cold-start lesson, incorrect drop, rapid and slow drags, stray clicks, all six red links, and 21-pair result.');
 console.log(evidence.video);
 }finally{await browser.close();}
})().catch(err=>{console.error(err);process.exitCode=1;});


