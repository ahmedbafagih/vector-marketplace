const fs = require('fs');
const vm = require('vm');
const assert = require('assert/strict');

const listing = {
  id: 1,
  name: 'Oak Chair',
  view: 'Selling',
  importedLive: true,
  liveURL: 'https://www.facebook.com/marketplace/item/1/'
};
const work = {
  enabled: true,
  leads: [],
  conversationProgress: {
    candidates: [{label: 'Alice old', person: 'Alice'}],
    reads: {'Alice old': {lead: {url: 'https://www.facebook.com/messages/t/1', last: 'old'}, proof: {}}},
    censusComplete: true
  }
};
const jobs = [];
const queued = [];
let inboxRows = [{label: 'Alice old', person: 'Alice', listing: 'Oak Chair', preview: 'old'}];
let aiCalls = 0;
const c = vm.createContext({
  Date, Map, Set, String, JSON, Error, Array, Object,
  rows: [listing],
  nativeState: {jobs},
  monitoringWanted: () => true,
  workFor: () => work,
  delay: async () => {},
  saveSoon() {},
  render() {},
  queueJob: (kind, r, extra) => queued.push({kind, itemId: r.id, ...extra}),
  nativeCall: async method => method === 'observeInbox'
    ? {url: 'https://www.facebook.com/marketplace/inbox?targetTab=SELLER', inboxRows}
    : {},
  infer: async () => {
    aiCalls++;
    throw Error('AI must not run during inbox polling');
  }
});
vm.runInContext(fs.readFileSync(__dirname + '/../Web/conversations.js', 'utf8'), c);

(async () => {
  const baselineJob = {kind: 'poll'};
  await c.pollInbox(baselineJob);
  assert.equal(queued.length, 0, 'first observation establishes a baseline for a known unchanged conversation');
  assert.equal(baselineJob.routineOnly, false, 'the first fingerprint baseline is persisted immediately');
  assert.equal(c.nativeState.inboxInitialized, true);
  assert.equal(c.nativeState.inboxFingerprintVersion, 2);
  assert(work.conversationProgress.reads['alice|oak chair'], 'legacy read migrated to stable key');

  const routineJob = {kind: 'poll'};
  await c.pollInbox(routineJob);
  assert.equal(queued.length, 0, 'unchanged poll queues no work');
  assert.equal(routineJob.routineOnly, true, 'an unchanged established poll can use batched persistence');

  inboxRows = [
    {label: 'Alice detail', person: 'Alice', listing: 'Oak Chair', preview: 'Can I pick up today?'},
    {label: 'Alice status', person: 'Alice', listing: 'Oak Chair', preview: 'Alice is waiting for your response'}
  ];
  const changedJob = {kind: 'poll'};
  await c.pollInbox(changedJob);
  assert.equal(queued.length, 1);
  assert.equal(changedJob.routineOnly, false, 'a changed preview is persisted immediately');
  assert.equal(JSON.stringify(queued[0]), JSON.stringify({
    kind: 'sync',
    itemId: 1,
    recurring: true,
    incremental: true,
    targetCandidateKeys: ['alice|oak chair']
  }));

  inboxRows.reverse();
  await c.pollInbox({kind: 'poll'});
  assert.equal(queued.length, 1, 'duplicate rows in a different DOM order do not create false changes');

  inboxRows.push({label: 'Bob new', person: 'Bob', listing: 'Oak Chair', preview: 'Still available?'});
  await c.pollInbox({kind: 'poll'});
  assert.equal(queued.length, 2, 'new buyer queues one targeted read');

  queued.length = 0;
  inboxRows = inboxRows.filter(x => x.label !== 'Alice detail');
  inboxRows[0] = {...inboxRows[0], preview: 'Tomorrow works'};
  inboxRows[1] = {...inboxRows[1], preview: 'Can collect now'};
  await c.pollInbox({kind: 'poll'});
  assert.equal(queued.length, 1, 'changes for one listing share one targeted job');
  assert.deepEqual(Array.from(queued[0].targetCandidateKeys).sort(), ['alice|oak chair', 'bob|oak chair']);

  queued.length = 0;
  work.enabled = false;
  inboxRows[0] = {...inboxRows[0], preview: 'Tonight works'};
  await c.pollInbox({kind: 'poll'});
  assert.equal(queued.length, 0, 'AI-off listings detect activity without spending AI on a conversation read');
  assert.match(work.last, /Inbox changed for Alice.*AI replies are off/);
  assert.equal(work.pendingInboxChanges[0].person, 'Alice');
  assert.equal(work.pendingInboxChanges[0].preview, 'Tonight works');
  assert.equal(c.nativeState.metrics.inboxChangesHeld, 1);
  assert.equal(aiCalls, 0);
  assert.equal(c.nativeState.metrics.inboxPolls, 7);
  assert.equal(c.nativeState.metrics.inboxChanges, 5);
  assert.equal(c.nativeState.metrics.pollsWithChanges, 4);
  console.log('PASS unchanged inbox uses zero AI, enabled listings queue reads, and AI-off listings hold changes locally');
})().catch(e => {
  console.error(e);
  process.exitCode = 1;
});
