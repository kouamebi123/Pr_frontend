import { createServer, request as httpRequest } from 'node:http';
import { request as httpsRequest } from 'node:https';
import { readFileSync, existsSync, statSync, createReadStream } from 'node:fs';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isIP } from 'node:net';

export function makeServer({root=fileURLToPath(new URL('.',import.meta.url)),api=process.env.API_URL||'http://localhost:4000',trustProxy=process.env.TRUST_PROXY==='true'}={}){
  const production=process.env.NODE_ENV==='production';
  const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.json':'application/json','.webmanifest':'application/manifest+json','.woff2':'font/woff2'};
  return createServer((req,res)=>{
    res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','strict-origin-when-cross-origin');
    res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' https: http: data:; media-src 'self' https: http: blob:; connect-src 'self'; object-src 'none'; frame-src https://www.youtube-nocookie.com https://www.youtube.com https://www.tiktok.com https://www.instagram.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self'");
    res.setHeader('Permissions-Policy','camera=(), microphone=(), geolocation=()');
    if(production)res.setHeader('Strict-Transport-Security','max-age=31536000');
    let path;try{path=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}catch{res.writeHead(400);res.end('URL non valide');return;}
    if(path.startsWith('/api/')){
      const incomingURL=new URL(req.url,'http://localhost');const target=new URL(api);target.pathname=incomingURL.pathname;target.search=incomingURL.search;const headers={...req.headers,host:target.host};delete headers['x-forwarded-for'];delete headers['x-real-ip'];
      // Public host the browser used: lets the API validate Origin even behind a custom domain.
      headers['x-forwarded-host']=String(req.headers.host||'');
      // Railway's edge supplies X-Real-IP. Trust it only when the server is
      // reachable exclusively through a trusted proxy that overwrites this header.
      const edgeIP=typeof req.headers['x-real-ip']==='string'?req.headers['x-real-ip'].trim():'';
      headers['x-forwarded-for']=trustProxy&&isIP(edgeIP)?edgeIP:req.socket.remoteAddress;
      const upstream=(target.protocol==='https:'?httpsRequest:httpRequest)(target,{method:req.method,headers,timeout:30000},incoming=>{
        // Never expose the internal host; cookies are scoped to this same-origin frontend.
        for(const [key,value] of Object.entries(incoming.headers)) if(!['connection','transfer-encoding','content-security-policy'].includes(key))res.setHeader(key,value);
        res.statusCode=incoming.statusCode;incoming.pipe(res);
      });
      upstream.on('timeout',()=>upstream.destroy(new Error('Backend timeout')));
      upstream.on('error',()=>{if(!res.headersSent){res.writeHead(502,{'Content-Type':'application/json'});res.end(JSON.stringify({error:'Le serveur est momentanément indisponible. Réessayez dans un instant.'}));}else res.destroy();});
      req.on('aborted',()=>upstream.destroy());req.pipe(upstream);return;
    }
    if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end();return;}
    if(path==='/health'){res.writeHead(200,{'Content-Type':'application/json'});res.end('{"status":"ok"}');return;}
    // Explicit public roots prevent source, environment and Git metadata disclosure.
    let file;if(path==='/')file=resolve(root,'index.html');
    else if(path.startsWith('/src/'))file=resolve(root,'.'+path);
    else file=resolve(root,'public','.'+path);
    const publicRoot=path.startsWith('/src/')?resolve(root,'src'):resolve(root,'public');
    if(path!=='/'&&(!file.startsWith(publicRoot+sep)||path.split('/').some(x=>x.startsWith('.')))){res.writeHead(404);res.end('Introuvable');return;}
    if(!existsSync(file)||!statSync(file).isFile()){res.writeHead(404);res.end('Introuvable');return;}
    res.setHeader('Content-Type',mime[extname(file)]||'application/octet-stream');res.setHeader('Cache-Control',path.startsWith('/assets/')?'public,max-age=86400':'no-cache');
    if(req.method==='HEAD')res.end();else createReadStream(file).pipe(res);
  });
}
if(process.argv[1]===fileURLToPath(import.meta.url))makeServer().listen(Number(process.env.PORT)||3000,process.env.HOST||'0.0.0.0',()=>console.log(`Porteurs de Réveil : port ${process.env.PORT||3000}`));
