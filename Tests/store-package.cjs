const fs=require('node:fs');
const assert=require('node:assert/strict');
const path=require('node:path');
const {execFileSync}=require('node:child_process');

const root=path.join(__dirname,'..');
const release=JSON.parse(fs.readFileSync(path.join(root,'build/release.json'),'utf8'));
const source=JSON.parse(fs.readFileSync(path.join(root,'Extension/manifest.json'),'utf8'));
const readManifest=archive=>JSON.parse(execFileSync('unzip',['-p',path.join(root,'build',archive),'manifest.json'],{encoding:'utf8'}));
const developer=readManifest(release.archive);
const store=readManifest(release.storeArchive);

assert.equal(developer.key,source.key,'developer package must preserve its stable unpacked ID');
assert.equal(store.key,undefined,'Chrome Web Store package must omit the forbidden key field');
assert.equal(store.version,source.version);
const {key,...developerWithoutKey}=developer;
assert.deepEqual(developerWithoutKey,store);
console.log('PASS developer and Chrome Web Store packages keep the correct manifest identity rules');
