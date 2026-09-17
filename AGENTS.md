# Vector setup instructions for coding agents

## Objective

Take a cloned Vector repository to a verified local macOS install with the fewest user handoffs.

## Required flow

1. Read `INSTALL.md` and `README.md`.
2. Never request or inspect Facebook cookies, saved passwords, browser profiles, API keys, or subscription tokens.
3. Run `./scripts/install-local.sh` from the repository root.
4. Confirm the installer reports a passing native self check and that `~/Applications/Vector.app` exists.
5. Use the setup guide to open the companion's Chrome Web Store listing. Ask the user only to approve **Add to Chrome**, review the popup disclosure, and choose **Connect Marketplace**.
6. If the listing is unavailable during store review, open **Developer installation**, then ask the user to enable Developer mode, choose Load unpacked, and select `~/Applications/Vector.app/Contents/Resources/Extension`.
7. After the user connects the companion, use Vector's setup guide to verify the selected AI runtime and Chrome connection.
8. Help the user answer the setup guide using their actual buying limits. Do not invent an address, budget, profit target, or permission to contact sellers.
9. Confirm the app shows the Discover workspace and a queued first search.

## Safe defaults

- Search distance: 35 km, which usually gives a broader candidate pool than 5 km.
- Outside the distance: keep for user review.
- Permission: Find and review only.
- Minimum profit: CAD 35.
- Minimum return: 30 percent.
- Largest item: fits in a car.
- AI daily request limit: 100.

These are recommendations, not substitutes for the user's answers. Contacting sellers requires the user to choose **Find and contact sellers** in the setup guide or Buying settings.

## Build and verification

The installer runs:

```sh
DEVELOPER_DIR=/Library/Developer/CommandLineTools python3 build.py
VECTOR_DATA_DIR=/tmp/vector-install-check build/Vector.app/Contents/MacOS/Vector --self-test
```

For source changes, also run `npm test`. Do not claim Marketplace automation is production proven from local tests alone. Live reliability requires observed Marketplace runs because Facebook can change its interface.

