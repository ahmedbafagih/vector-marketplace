const fs=require('node:fs');
const assert=require('node:assert/strict');
const path=require('node:path');

const root=path.join(__dirname,'..');
const manifest=JSON.parse(fs.readFileSync(path.join(root,'Extension/manifest.json'),'utf8'));
const popup=fs.readFileSync(path.join(root,'Extension/popup.html'),'utf8');
const onboarding=fs.readFileSync(path.join(root,'Web/onboarding.js'),'utf8');
const native=fs.readFileSync(path.join(root,'Sources/main.swift'),'utf8');

assert.equal(manifest.manifest_version,3);
assert.equal(manifest.name,'Marketplace AI');
assert.equal(manifest.version,'0.2.31');
assert.match(manifest.description,/Free, open source/);
assert.match(manifest.description,/Floss and Pixel/);
assert.deepEqual(manifest.host_permissions,[
 'https://www.facebook.com/*',
 'https://facebook.com/*',
 'https://m.facebook.com/*'
]);
assert.match(popup,/Before you connect/);
assert.match(popup,/visible Marketplace listings, photos, controls, and relevant conversation text/);
assert.match(popup,/Choosing Connect authorizes this access/);
assert.match(popup,/PRIVACY\.md/);
assert.match(onboarding,/Add to Chrome/);
assert.match(onboarding,/Developer installation/);
assert.match(onboarding,/openCompanionStore/);
assert.match(native,/url\.host=="chromewebstore\.google\.com"/);
assert.match(onboarding,/cfkdpkejcgfgokangnmkoofnmigkkokg/);
assert.match(native,/cfkdpkejcgfgokangnmkoofnmigkkokg/);
assert.deepEqual(JSON.parse(fs.readFileSync(path.join(root,'Web/chrome-config.json'),'utf8')).extensionIDs,[
 'elkhmobmkaiepgennfgabmbolldjlmpb',
 'cfkdpkejcgfgokangnmkoofnmigkkokg'
]);
console.log('PASS store installation guidance and pre-connection disclosure');
