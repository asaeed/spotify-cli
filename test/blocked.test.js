import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { blockedArtists } from '../src/commands/blocked.js';

test('account export reads blocked artists only, with IDs and deduplication', () => {
 const a={name:'Blocked Artist',uri:'spotify:artist:1234567890123456789012'};
 assert.deepEqual(blockedArtists({artists:[{name:'Included Artist'}],bannedTracks:[{name:'A track'}],bannedArtists:[a,a]}),[{name:a.name,uri:a.uri,id:'1234567890123456789012'}]);
 assert.deepEqual(blockedArtists({bannedArtists:[]}),[]);
 assert.deepEqual(blockedArtists({bannedArtists:[{name:'Name only'}]}),[{name:'Name only',uri:null,id:null}]);
});
test('missing or malformed exclusions cannot be mistaken for an empty block list', () => {
 for(const value of [{},{bannedArtists:null},{bannedArtists:['Artist']},{bannedArtists:[{}]},{bannedArtists:[{name:'Wrong',uri:'spotify:track:1234567890123456789012'}]}])assert.throws(()=>blockedArtists(value),/bad_input:/);
});
test('blocked command works offline without auth, does not expose unrelated export data, and gives actionable errors',async()=>{
 const root=await mkdtemp(join(tmpdir(),'spotify-blocked-'));
 try{
 const file=join(root,'YourLibrary.json');await writeFile(file,JSON.stringify({bannedArtists:[{name:'Blocked Artist'}],privateData:'DO_NOT_EMIT'}));
 const run=args=>spawnSync(process.execPath,['bin/spotify.js','blocked',...args],{encoding:'utf8',env:{...process.env,HOME:root}});
 let result=run(['--file',file]);assert.equal(result.status,0);assert(!result.stdout.includes('DO_NOT_EMIT'));let data=JSON.parse(result.stdout).data;assert.equal(data.live,false);assert.equal(data.count,1);
 for(const args of [[],['--file'],['--file',join(root,'absent')]]){result=run(args);assert.equal(result.status,3);assert.match(JSON.parse(result.stdout).error.message,/spotify blocked --file/);}
 await writeFile(file,'invalid');result=run(['--file',file]);assert.equal(result.status,3);assert.match(JSON.parse(result.stdout).error.message,/Invalid JSON/);
 }finally{await rm(root,{recursive:true,force:true});}
});
