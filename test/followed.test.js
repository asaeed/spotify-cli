import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
test('followed artists paginate the nested cursor response and preserve IDs', () => {
  const dir = mkdtempSync(join(tmpdir(), 'spotify-followed-'));
  try {
    writeFileSync(join(dir, 'tokens.json'), JSON.stringify({access_token:'fixture',expires_at:Date.now()+3600000}));
    const program = `globalThis.fetch = async url => {
      const u = new URL(url), after = Number(u.searchParams.get('after') || 0), size = Number(u.searchParams.get('limit'));
      if(size>50 || u.searchParams.get('type')!=='artist') throw Error('invalid request');
      const items=Array.from({length:Math.min(size,123-after)},(_,i)=>({id:'id'+(after+i),name:'Artist '+(after+i)}));
      return {status:200,ok:true,text:async()=>JSON.stringify({artists:{items,next:after+items.length<123?'next':null,cursors:{after:String(after+items.length)}}})};
    };const {cmdFollowed}=await import('./src/commands/read.js');await cmdFollowed({limit:123});`;
    const r=spawnSync(process.execPath,['--input-type=module','-e',program],{cwd:new URL('../',import.meta.url),env:{...process.env,SPOTIFY_CLI_DIR:dir},encoding:'utf8'});
    assert.equal(r.status,0,r.stderr);const d=JSON.parse(r.stdout).data;assert.equal(d.count,123);assert.equal(d.artists[122].id,'id122');
  }finally{rmSync(dir,{recursive:true,force:true});}
});
