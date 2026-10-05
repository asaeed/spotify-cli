import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';

const program = `
 globalThis.fetch = async url => {
   const u = new URL(url);
   const offset = Number(u.searchParams.get('offset') || 0);
   const limit = Number(u.searchParams.get('limit'));
   if (limit > 50) throw new Error('API page too large');
   const all = Array.from({length: 123}, (_,i)=>({id:'id'+i,name:i===77?'Robert Glasper':'Artist '+i}));
   return {status:200,ok:true,text:async()=>JSON.stringify({items:all.slice(offset,offset+limit),next:offset+limit<all.length?'https://api.spotify.com/v1/me/top/artists?offset='+ (offset+limit)+'&limit='+limit:null,total:all.length})};
 };
 const {cmdTop}=await import('./src/commands/read.js');
 await cmdTop('artists',{time_range:'long_term',limit:123});
`;
test('top artist request fetches later pages while respecting API page size',()=>{
 const dir=mkdtempSync(join(tmpdir(),'spotify-pagination-'));
 try {
  writeFileSync(join(dir,'tokens.json'),JSON.stringify({access_token:'fixture-token',expires_at:Date.now()+3600000}));
  const result=spawnSync(process.execPath,['--input-type=module','-e',program],{cwd:new URL('../',import.meta.url),env:{...process.env,SPOTIFY_CLI_DIR:dir},encoding:'utf8'});
  assert.equal(result.status,0,result.stderr);
  const env=JSON.parse(result.stdout);
  assert.equal(env.data.count,123);
  assert.equal(env.data.items[77].name,'Robert Glasper');
  assert.equal(env.data.items[122].id,'id122');
 }finally{rmSync(dir,{recursive:true,force:true});}
});

test('large JSON envelopes fully drain stdout pipes before exiting',()=>{
 const result=spawnSync(process.execPath,['--input-type=module','-e',"import {ok} from './src/envelope.js'; ok({large:'x'.repeat(1024*1024)});"],{cwd:new URL('../',import.meta.url),encoding:'utf8',maxBuffer:2*1024*1024});
 assert.equal(result.status,0,result.stderr);
 assert.equal(JSON.parse(result.stdout).data.large.length,1024*1024);
});
