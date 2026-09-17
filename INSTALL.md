# Install Vector

Vector currently supports macOS 14 or newer. The local installer builds the app, runs a storage self check, installs it in `~/Applications`, and opens Vector.

## Fast setup

From Terminal in this repository:

```sh
./scripts/install-local.sh
```

The installer does not need administrator access. It uses Apple Command Line Tools and Python 3, both of which are commonly present on a development Mac. If Apple Command Line Tools are missing, run `xcode-select --install` once and rerun the installer.

For automated QA without opening Vector, Finder, or Chrome, use `./scripts/install-local.sh --no-open`.

The setup guide opens the Vector Marketplace Companion in the Chrome Web Store. Choose **Add to Chrome**, open Marketplace, open the Vector companion, review its disclosure, and choose **Connect Marketplace**. Chrome always requires the user to approve an extension installation.

Until the Web Store review is complete, use the setup guide's **Developer installation** fallback:

1. Open `chrome://extensions`.
2. Turn on Developer mode.
3. Choose **Load unpacked**.
4. Select `~/Applications/Vector.app/Contents/Resources/Extension`.
5. Open the Vector companion, review its disclosure, and choose **Connect Marketplace**.

Vector then presents a short setup guide. It asks for:

1. Products or exact models to find.
2. Search area, pickup starting point, and travel distance. Vector recommends 35 km for a broader selection and explains that 5 km produces fewer results.
3. Per item price, accepted deal limit, minimum profit, and minimum return.
4. Find and review, or find and contact sellers.
5. AI runtime and Chrome connection checks.

Vector starts its first search only after both connections pass. The default permission is **Find and review**, so first run setup does not message sellers unless the user explicitly selects **Find and contact sellers**.

## AI agent setup

Give an AI coding agent this instruction:

> Open this repository, read `AGENTS.md`, and run `./scripts/install-local.sh`. Let Vector open the Chrome Web Store companion. Ask me only to approve Add to Chrome and Connect Marketplace. Do not copy credentials or browser data. Then verify both connections in Vector and help me complete the setup guide. If the store listing is not yet available, use the setup guide's Developer installation fallback.

The unavoidable manual step is Chrome's extension approval. Chrome does not allow a local app or coding agent to silently approve **Add to Chrome**. The unpacked fallback additionally requires **Load unpacked**.

## Updating an existing install

Run the same command again. The installer closes Vector, rebuilds it, verifies the build, and replaces the app. Workspace data remains in `~/Library/Application Support/Vector/vector.sqlite`.

## Remove Vector

Quit Vector, remove `~/Applications/Vector.app`, remove the Vector companion from Chrome, and optionally remove `~/Library/Application Support/Vector` if you also want to delete the local workspace and backups.
