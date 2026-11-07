
const {createServer}=require('node:http');
const {readFile}=require('node:fs/promises');
const {join}=require('node:path');
const files={'/':'theater.html','/garden':'garden-story.html','/pencils':'pencil-story.html','/rail':'rail-story.html'};
createServer(async(req,res)=>{
  const file=Object.hasOwn(files,req.url)?files[req.url]:null;
  if(!file){res.writeHead(404).end();return;}
  try {
    const html=await readFile(join(__dirname,file));
    res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}).end(html);
  } catch {res.writeHead(404).end('Preview unavailable');}
}).listen(4849,'127.0.0.1',()=>console.log('http://127.0.0.1:4849/'));

