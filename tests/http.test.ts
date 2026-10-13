import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
test('Ubuntu-compatible runtime: health, assets, corrupt input, static path whitelist',async()=>{
  const child=spawn(process.execPath,[fileURLToPath(new URL('../src/server.ts',import.meta.url))],{env:{...process.env,HOST:'127.0.0.1',PORT:'0'},stdio:['ignore','pipe','pipe']});
  try {
    const base=await new Promise<string>((resolve,reject)=>{
      const timeout=setTimeout(()=>reject(Error('Server startup timeout')),10000);
      child.once('error',reject);child.once('exit',code=>reject(Error(`Server exited ${code}`)));
      child.stdout.on('data',data=>{const match=/http:\/\/127\.0\.0\.1:\d+/.exec(String(data));if(match){clearTimeout(timeout);resolve(match[0]);}});
    });
    const health=await fetch(base+'/api/health');assert.equal(health.status,200);assert.equal((await health.json()).app,'tool1-parts-card');
    for(const file of ['/','/app.js','/lot-colors.js','/print.html','/print.js','/print-date.js','/style.css']) {
      const response=await fetch(base+file);assert.equal(response.status,200,file);assert.ok(response.headers.get('content-security-policy'));await response.text();
    }
    const invalid=await fetch(base+'/api/import',{method:'POST',body:Buffer.alloc(150)});assert.equal(invalid.status,422);assert.ok((await invalid.json()).error);
    const secret=await fetch(base+'/.git/config');assert.equal(secret.status,404);await secret.text();
    const alive=await fetch(base+'/api/health');assert.equal(alive.status,200);await alive.text();
  } finally {child.kill();await new Promise<void>(resolve=>{if(child.exitCode!==null)resolve();else child.once('exit',()=>resolve());});}
});
