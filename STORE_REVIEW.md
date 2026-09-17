# Chrome Web Store reviewer instructions

Marketplace AI requires the Marketplace AI macOS desktop app and a Facebook account with Marketplace access.

The upload artifact is `build/Marketplace-AI-0.2.31-store.zip`. The ordinary archive preserves the stable unpacked developer ID and is not accepted by the Chrome Web Store.

## Install the desktop app

1. Clone https://github.com/ahmedbafagih/vector-marketplace on a Mac running macOS 14 or newer.
2. Run `./scripts/install-local.sh` from Terminal.
3. Open `~/Applications/Marketplace AI.app` if it is not already open.

The installer builds the app locally and registers the native messaging host at `~/Library/Application Support/Google/Chrome/NativeMessagingHosts/com.vector.marketplace.json`.

## Test the companion

1. Install this Chrome Web Store item.
2. Open https://www.facebook.com/marketplace/ and sign in with a test account that has Marketplace access.
3. Open the Marketplace AI popup.
4. Review the visible data disclosure and choose **Connect Marketplace**.
5. Return to Marketplace AI. In the setup guide, choose **Check connections**.

A successful check shows **Marketplace connection verified**. The setup guide defaults to **Find and review**, which does not contact sellers.

## Features requiring Marketplace content

The companion reads the visible Marketplace page only after the user chooses **Connect Marketplace**. Marketplace AI can then request observations or page actions for the exact Marketplace workflow the user enables. The extension rejects navigation outside Facebook Marketplace and identified Messenger conversations.

No reviewer credentials are included in the package. Facebook authentication and any Facebook verification remain in Chrome and must be completed by the reviewer.

## Disconnect

Open the companion popup and choose **Disconnect**. This clears the active page connection and in-memory observation state.
