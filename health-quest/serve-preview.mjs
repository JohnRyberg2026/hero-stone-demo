// Local development server only. No payment or production API routes.
import http from 'node:http';import {readFile} from 'node:fs/promises';import {resolve,extname,sep} from 'node:path';import {fileURLToPath} from 'node:url';
const args=process.argv.slice(2),value=(name,fallback)=>{const i=args.indexOf(name);return i<0?fallback:args[i+1];};
const root=fileURLToPath(new URL('.',import.meta.url)),port=Number(value('--port',process.env.PORT||3000)),host=value('--host','127.0.0.1');
const types={'.html':'text/html','.mjs':'text/javascript','.css':'text/css','.json':'application/json'};
http.createServer(async(req,res)=>{try{const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname),file=resolve(root,'.'+(pathname==='/'?'/model.html':pathname));if(!file.startsWith(root.endsWith(sep)?root:root+sep)||!types[extname(file)]||pathname.includes('node_modules')){res.writeHead(404);res.end('Not found');return;}const data=await readFile(file);res.writeHead(200,{'content-type':types[extname(file)],'cache-control':'no-store'});res.end(data);}catch{res.writeHead(404);res.end('Not found');}}).listen(port,host,()=>console.log(`Health Quest preview at http://${host}:${port}`));
