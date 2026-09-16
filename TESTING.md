# Testing preview checklist

## Automated verification

```sh
npm ci
python3 build.py
npm test
python3 scripts/privacy_check.py
```

For the native self-test, use a separate data directory so your real workspace is not changed:

```sh
VECTOR_DATA_DIR="$(mktemp -d)" build/Vector.app/Contents/MacOS/Vector --self-test
```

The JavaScript suite uses simulated browser and AI responses. It sends no live Marketplace messages. The composer fixture checks DOM insertion, not Facebook's live controlled editor. Native self-tests cover local behavior, not real deal completion.

## Manual tester checklist

1. Build, install, connect the companion, and verify matching versions.
2. Confirm a fresh workspace is empty and inventory persists across a restart.
3. Add one item with an original photo and cost. Check missing-field guidance and price research.
4. Import one existing listing and verify its title, photo, live link, and separate buyer conversations.
5. Start sourcing in Find only. Verify location, asking price, valuation evidence, and spending rules before allowing contact.
6. If you choose to enable automatic messages, monitor one real conversation. Confirm the intended recipient, exact visible outgoing text, and one send only.
7. Check that connection interruption retains work and a reconnect does not duplicate a message.
8. Check that a pickup is recorded only after agreement on price, time, and place. No confirmed pickup end-to-end result is claimed for this preview.
9. Test narrow and wide windows, scrolling, expanded error details, and exact-item review links.

Report macOS, app and companion versions, expected result, observed result, and a redacted error. Never attach a live database or unredacted conversation log.
