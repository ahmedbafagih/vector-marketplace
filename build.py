from pathlib import Path
import re, subprocess, shutil, plistlib, sys, json, zipfile, hashlib, platform
ROOT=Path(__file__).resolve().parent
target=platform.machine()+'-apple-macos14.0'
version=json.loads((ROOT/'Extension/manifest.json').read_text())['version']
source=ROOT/'Template.html'
s=source.read_text()
s=re.sub(r'(<script id="mp-listing-data" type="application/json">).*?(</script>)',r'\g<1>[]\2',s,flags=re.S)
s=re.sub(r'(<script id="mp-photo-data" type="application/json">).*?(</script>)',r'\g<1>{}\2',s,flags=re.S)
s=re.sub(r'const listingWork=\{.*?\n\};\nfunction workFor', 'const listingWork={};\nfunction workFor',s,flags=re.S)
s=re.sub(r'const businessItems=\[.*?\n\];', 'const businessItems=[];',s,flags=re.S)
s=s.replace("let view='Selling',category='All',selected=9", "let view='Stock',category='All',selected=null")
s=s.replace("categories:['All']", "categories:['All']")
s=s.replace("mode:'Auto-negotiate'", "mode:'Find only'")
s=s.replace('https://cdn.jsdelivr.net/npm/d3@7.9.0/dist/d3.min.js','vendor/d3.min.js').replace('https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js','vendor/xlsx.full.min.js')
s=s.replace('async src="vendor/xlsx','src="vendor/xlsx')
s=s.replace('Demo · real photos','Local workspace').replace('CAD · Demo','CAD').replace('Marketplace desktop concept','Vector Marketplace workspace')
s=s.replace('Photo unavailable','Add photo').replace('Timing & follow-ups','Timing').replace("'AI replies'","'Replies sent'")
s=s.replace("Math.max(...rows.map(x=>x.id))+1","Math.max(0,...rows.map(x=>x.id))+1").replace("Math.max(...rows.map(r=>r.id))+1","Math.max(0,...rows.map(r=>r.id))+1")
s=s.replace("+photos[r.photo]+", "+esc(safeImageSource(photos[r.photo]))+")
s=s.replace("+r.url+", "+esc(r.url||'')+")
s=s.replace("function workState(w){return","function workState(w){if(w.purchased)return 'Purchased';return")
s=s.replace('Sample data','Your data').replace('Sample estimates.','Estimates.').replace('Publishing is simulated.','Saved on this Mac.').replace('Publishing is simulated in this preview.','Publishing uses the signed-in Marketplace window.').replace('Marketplace price changes are simulated.','Update the live Marketplace price separately.').replace('Eligible automation resumed in the demo.','Eligible automation resumed.').replace('Session only · Backup before closing','Saved on this Mac').replace('Saved in this preview.','Saved on this Mac.').replace('Activate this demo listing to receive buyers.','Publish this listing to receive buyers.').replace('Activate demo listing','Publish listing')
s=s.replace('Ask or command. Try: show furniture','Ask or command. Try: show inventory').replace('Run demo command','Run command')
s=s.replace('businessView();renderInventory();renderCore();','businessView();renderInventory();renderCore();nativeDecorate();saveAfterRender();')
# Replace the last bootstrap, leaving existing event listeners and preserving the approved visuals.
s=s.replace("render();$$('[data-boot]')", (ROOT/'Web/native.js').read_text()+"\n"+(ROOT/'Web/sourcing.js').read_text()+"\n"+(ROOT/'Web/pricing.js').read_text()+"\n"+(ROOT/'Web/imports.js').read_text()+"\n"+(ROOT/'Web/attention.js').read_text()+"\n"+(ROOT/'Web/connections.js').read_text()+"\n"+(ROOT/'Web/operations.js').read_text()+"\n"+(ROOT/'Web/conversations.js').read_text()+"\nrender();$$('[data-boot]')")
s=s.replace("+l.id+", "+esc(l.id)+").replace("+l.state+", "+esc(l.state)+")
# Shutdown and page events use a single serialized snapshot, committed by the native host.
s=s.replace('<style>','<style>\nbody{margin:0;background:#080f17}#marketplace-flight-deck{border-radius:0;min-height:100vh}#marketplace-flight-deck .native-jobs article{padding:14px 0;border-bottom:1px solid #263644}#marketplace-flight-deck .native-jobs span{display:block;color:#a0b3c2}#marketplace-flight-deck .mp-top{flex-wrap:wrap}\n',1)
s=s.replace('<script src="vendor/d3.min.js">','<script src="vendor/lucide.min.js"></script>\n<script src="vendor/d3.min.js">')
# Native bridges cannot be reached from the separate remote Marketplace webview.
html='<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Vector</title></head><body>'+s+'<link rel="stylesheet" href="polish.css"></body></html>'
(ROOT/'Web/index.html').write_text(html)
app=ROOT/'build/Vector.app';contents=app/'Contents';(contents/'MacOS').mkdir(parents=True,exist_ok=True)
if (contents/'Resources').exists():shutil.rmtree(contents/'Resources')
shutil.copytree(ROOT/'Web',contents/'Resources')
plist={'CFBundleName':'Vector','CFBundleDisplayName':'Vector','CFBundleIdentifier':'com.ahmed.vector','CFBundleVersion':version,'CFBundleShortVersionString':version,'CFBundleExecutable':'Vector','CFBundlePackageType':'APPL','LSMinimumSystemVersion':'14.0','NSHighResolutionCapable':True,'NSPrincipalClass':'NSApplication','NSSupportsAutomaticTermination':False}
(contents/'Info.plist').write_bytes(plistlib.dumps(plist))
subprocess.run(['swiftc','-target',target,'-swift-version','5','-O','-framework','Cocoa','-framework','CoreLocation','-framework','MapKit','-framework','WebKit','-framework','ImageIO','-framework','UniformTypeIdentifiers','-framework','UserNotifications','-lsqlite3',str(ROOT/'Shared/Wire.swift'),*[str(p) for p in sorted((ROOT/'Sources').glob('*.swift'))],'-o',str(contents/'MacOS/Vector')],check=True)
shutil.copytree(ROOT/'Extension',contents/'Resources/Extension',dirs_exist_ok=True)
subprocess.run(['swiftc','-target',target,'-O',str(ROOT/'Shared/Wire.swift'),str(ROOT/'NativeHost/main.swift'),'-o',str(contents/'MacOS/VectorChromeHost')],check=True)
subprocess.run(['codesign','--force','--deep','--sign','-',str(app)],check=True)
# The review ZIP and app companion always come from the same build.
archive=ROOT/'build'/f'Vector-Marketplace-Companion-{version}.zip'
files=sorted(p for p in (ROOT/'Extension').rglob('*') if p.is_file() and p.name!='.DS_Store')
with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED) as z:
    for p in files:z.write(p,p.relative_to(ROOT/'Extension'))
with zipfile.ZipFile(archive) as z:
    for p in files:
        relative=p.relative_to(ROOT/'Extension')
        if p.read_bytes()!=z.read(str(relative)) or p.read_bytes()!=(contents/'Resources/Extension'/relative).read_bytes():
            raise RuntimeError(f'Companion packaging mismatch: {relative}')
(ROOT/'build/release.json').write_text(json.dumps({'version':version,'archive':archive.name,'sha256':hashlib.sha256(archive.read_bytes()).hexdigest(),'files':{str(p.relative_to(ROOT/'Extension')):hashlib.sha256(p.read_bytes()).hexdigest() for p in files}},indent=2)+'\n')
print(app)
print(archive)
