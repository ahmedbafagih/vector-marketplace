# Vector Marketplace

A local macOS workspace for Marketplace sourcing, inventory, selling conversations, and pickup coordination. Bring your own Facebook session and supported Codex or Claude Code CLI.

**Status: testing preview, version 0.2.23.** This is open source software for supervised testing. Browser automation depends on Facebook's interface. The latest composer recovery change needs live verification, and a complete automated negotiation through confirmed pickup has not yet been demonstrated for this release. It is not a production reliability or earnings guarantee.

## What it does

- Import inventory from CSV or Excel, add real photos, and manage cards or a table.
- Import your existing Marketplace listings and track their individual buyer conversations.
- Research asking prices and estimate resale value, costs, and profit ranges.
- Source products using search terms, location, distance, budget, and margin controls.
- Enable buying and selling automation independently, with per-listing controls.
- Review blocked tasks, retry recoverable failures, or write a reply yourself.
- Track evidenced pickup agreements, recorded purchases, sales, and local backups.

It cannot guarantee resale demand, seller responses, successful purchases, or profit. Automatic follow-ups without a new incoming message are not implemented.

## Requirements

- macOS 14 or later. The current local verification machine is Apple Silicon; Intel compatibility is not yet verified.
- Google Chrome with a Facebook account that can access Marketplace.
- Apple command line developer tools with Swift, and Python 3 to build the app.
- Node.js 22 or later and npm to run the JavaScript tests.
- An independently installed and signed-in Codex CLI or Claude Code CLI for AI features. Provider access and usage limits apply. Vector does not include an AI subscription or promise compatibility with every CLI version.

## Build and test

For an Apple Silicon Mac, a locally built app and matching companion are available on the [testing preview release page](https://github.com/ahmedbafagih/vector-marketplace/releases/tag/v0.2.23-preview.1). Download `Vector-0.2.23-macOS-arm64-preview.zip`, unzip it, then follow **First run** below. Checksums accompany the downloads. The app is not notarized; building from source is also supported.

```sh
git clone https://github.com/ahmedbafagih/vector-marketplace.git
cd vector-marketplace
npm ci
python3 build.py
npm test
```

If Xcode is selected but its setup is incomplete, finish Xcode setup yourself, or use an already installed Command Line Tools toolchain:

```sh
DEVELOPER_DIR=/Library/Developer/CommandLineTools python3 build.py
```

Output: `build/Vector.app`, a matching companion ZIP, and `build/release.json`. The app is ad hoc signed for local development, not Developer ID signed or notarized. macOS may require review through its normal Privacy & Security controls. There is no Chrome Web Store release or automatic updater yet.

## First run

1. Copy `build/Vector.app` into your user Applications folder and launch it. Keep it in a stable location, because Chrome uses the native helper inside that app.
2. In Vector, open Connections and check your chosen AI CLI connection.
3. In Chrome, open `chrome://extensions`, enable Developer mode, and click **Load unpacked**.
4. Select the folder inside the installed app: `Vector.app/Contents/Resources/Extension`. In the folder picker, use Command+Shift+G to enter its full path, for example `~/Applications/Vector.app/Contents/Resources/Extension`.
5. Sign in to Facebook in Chrome. Open the Vector Marketplace Companion popup and choose **Connect Marketplace**.
6. Check Connections in Vector. Confirm that Chrome and AI are connected and that the companion version is 0.2.23.
7. Set your own buying search area, spending limits, and selling pickup spot before enabling automation. Begin with **Find only** and one listing while reviewing Activity and Needs attention.

Automation can send real messages or publish real listings when you enable those actions. Keep the app and Chrome running and the Mac awake and online. Vector uses a dedicated Marketplace window that can stay behind your other windows. Facebook sign-in or verification must be completed by you.

When updating a source build, rebuild and replace the installed app, then reload its existing unpacked companion in `chrome://extensions`. Verify the running version again. Files on disk and an already-running Chrome worker can be different versions.

## Privacy

Inventory, conversations, jobs, and backups are stored locally under `~/Library/Application Support/Vector`. Relevant listing and conversation content is sent to your selected AI provider through its CLI. This is not exclusively on-device AI. The companion does not copy browser cookies or saved passwords. See [PRIVACY.md](PRIVACY.md).

This repository starts with a clean source history. It excludes development session reports, user databases, conversation logs, account credentials, personal photos, and real Marketplace conversation identifiers. Test data is synthetic. Do not upload your live database or unredacted logs in an issue.

## Testing and limitations

The JavaScript suite covers simulated native/browser/AI flows, conversation identity, reply deduplication, spending rules, connection recovery, and UI state. Passing those tests does not prove a Facebook message was delivered. [TESTING.md](TESTING.md) describes the checks and a tester checklist. GitHub Actions runs the suite, builds a macOS app from source, and checks native persistence in an isolated workspace.

## Project layout

| Path | Purpose |
| --- | --- |
| `Sources/`, `Shared/`, `NativeHost/` | Swift app, persistence, AI CLI adapter, and native messaging |
| `Web/` | UI, durable jobs, sourcing, conversations, and bundled dependencies |
| `Extension/` | Packaged Chrome observation and action code |
| `Template.html` | UI template used to generate `Web/index.html` |
| `Tests/` | Synthetic tests; no live messages sent by the JavaScript suite |

## Contributing and license

See [CONTRIBUTING.md](CONTRIBUTING.md) and [SECURITY.md](SECURITY.md). Vector is MIT licensed. Third-party libraries and brand marks retain their own rights; see [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). Vector is not affiliated with Meta, Google, OpenAI, or Anthropic.
