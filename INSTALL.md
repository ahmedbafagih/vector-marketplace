# Install Marketplace AI

Marketplace AI currently supports macOS 14 or newer. The local installer builds the app, runs a storage self check, installs it in `~/Applications`, and opens Marketplace AI.

## Fast setup

From Terminal in this repository:

```sh
./scripts/install-local.sh
```

The installer does not need administrator access. It uses Apple Command Line Tools and Python 3, both of which are commonly present on a development Mac. If Apple Command Line Tools are missing, run `xcode-select --install` once and rerun the installer.

For automated QA without opening Marketplace AI, Finder, or Chrome, use `./scripts/install-local.sh --no-open`.

The setup guide opens Marketplace AI in the Chrome Web Store. Choose **Add to Chrome**, open Marketplace, open the Marketplace AI companion, review its disclosure, and choose **Connect Marketplace**. Chrome always requires the user to approve an extension installation.

Until the Web Store review is complete, use the setup guide's **Developer installation** fallback:

1. Open `chrome://extensions`.
2. Turn on Developer mode.
3. Choose **Load unpacked**.
4. Select `~/Applications/Marketplace AI.app/Contents/Resources/Extension`.
5. Open the Marketplace AI companion, review its disclosure, and choose **Connect Marketplace**.

Marketplace AI then presents a short setup guide. It asks for:

1. Products or exact models to find.
2. Search area, pickup starting point, and travel distance. Marketplace AI recommends 35 km for a broader selection and explains that 5 km produces fewer results.
3. Per item price, accepted deal limit, minimum profit, and minimum return.
4. Find and review, or find and contact sellers.
5. AI runtime and Chrome connection checks.

Marketplace AI starts its first search only after both connections pass. The default permission is **Find and review**, so first run setup does not message sellers unless the user explicitly selects **Find and contact sellers**.

## AI agent setup

Give an AI coding agent this instruction:

> Open this repository, read `AGENTS.md`, and run `./scripts/install-local.sh`. Let Marketplace AI open the Chrome Web Store companion. Ask me only to approve Add to Chrome and Connect Marketplace. Do not copy credentials or browser data. Then verify both connections in Marketplace AI and help me complete the setup guide. If the store listing is not yet available, use the setup guide's Developer installation fallback.

The unavoidable manual step is Chrome's extension approval. Chrome does not allow a local app or coding agent to silently approve **Add to Chrome**. The unpacked fallback additionally requires **Load unpacked**.

## Updating an existing install

Run the same command again. The installer closes Marketplace AI, rebuilds it, verifies the build, and replaces the app. The legacy `Vector.app` path is retained as an alias when migrating, so existing unpacked companion installations keep their path. Workspace data remains in `~/Library/Application Support/Vector/vector.sqlite`.

## Remove Marketplace AI

Quit Marketplace AI, remove `~/Applications/Marketplace AI.app`, remove the Marketplace AI companion from Chrome, and optionally remove `~/Library/Application Support/Vector` if you also want to delete the local workspace and backups.
