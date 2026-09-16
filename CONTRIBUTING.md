# Contributing

Use a branch and a pull request. Explain the observed problem, the change, and the exact checks you ran. Follow the build and setup instructions in README.md.

Run `npm ci`, `python3 build.py`, `npm test`, and `python3 scripts/privacy_check.py` before submitting. Regenerate `Web/index.html` when changing the template or UI modules. Re-run relevant tests after every adjustment. Use synthetic fixtures and a separate `VECTOR_DATA_DIR` for native tests.

Keep browser actions scoped to the selected listing and conversation. Preserve price and spending boundaries, explicit pauses, replay prevention, and verified delivery checks. Never fix a failing test by weakening those boundaries without a documented design review.

Do not commit credentials, private conversation URLs, account data, databases, backups, screenshots of real conversations, or local AI run output. An anonymized error and reproduction steps are usually enough. Avoid changing a user's live automation settings as part of a test.
