const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync(__dirname+'/../Web/sourcing.js','utf8');
const c=vm.createContext({Number,Math,Date,auto:{maxOffer:600,budget:1000,strategy:'Balanced',priceEnabled:true,sourcing:{minROI:30,maxDiscount:20}},minProfit:35});
for(const name of ['sourcePurchaseCeiling','sourceDealValue','sourceDiscountLimit','sourceOpeningOffer'])vm.runInContext(source.split('\n').find(x=>x.startsWith('function '+name+'(')),c);
assert.equal(c.sourcePurchaseCeiling(500,15),373,'30% return binds, not hidden 25% budget cap');
assert.equal(c.sourcePurchaseCeiling(150,15),100,'dollar profit requirement binds');
c.auto.maxOffer=90;assert.equal(c.sourcePurchaseCeiling(500,15),90);c.auto.maxOffer=600;
for(const [ask,offer] of [[250,153],[100,65],[180,128],[140,37],[200,90]])assert.equal(c.sourceOpeningOffer({ask},offer),0,'historical large-discount offers are blocked');
for(const strategy of ['Balanced','Firm offer','Close fast']){c.auto.strategy=strategy;for(let ask=5;ask<=500;ask+=5)for(let limit=1;limit<=550;limit+=11){const opening=c.sourceOpeningOffer({ask},limit);if(opening){assert(opening<=ask&&opening<=limit);assert(opening>=Math.ceil(ask*.8))}else assert(limit<Math.ceil(ask*.8))}}
c.auto.strategy='Balanced';assert.equal(c.sourceOpeningOffer({ask:100},120),95);assert.equal(c.sourceOpeningOffer({ask:100},85),80);c.auto.sourcing.maxDiscount=10;assert.equal(c.sourceOpeningOffer({ask:100},85),0);assert.equal(c.sourceOpeningOffer({ask:100},100),95);
c.auto.priceEnabled=false;assert.equal(c.sourceOpeningOffer({ask:100},99),0);assert.equal(c.sourceOpeningOffer({ask:100},110),100);
console.log('PASS margin ceiling, explicit cap, historical lowballs, no overpayment, all approach boundaries and contact-only mode');
