# Chrome Web Store listing

## Product name

Marketplace AI

## Summary

Free, open source Facebook Marketplace automation for sourcing, negotiation, listings, and buyer replies. By Floss and Pixel.

## Detailed description

Marketplace AI connects the Facebook Marketplace pages you choose to the Marketplace AI desktop app on your Mac.

Use it with Marketplace AI to:

- Review Marketplace listings against your buying rules.
- Keep inventory and listing information organized locally.
- Monitor relevant buyer and seller conversations.
- Carry out the Marketplace actions you explicitly enable in Marketplace AI.
- Recover the local connection when Chrome or Marketplace AI restarts.

The companion requires the open source Marketplace AI desktop app. It does not operate independently and has no Marketplace AI cloud backend. Your Facebook sign-in remains in Chrome. Marketplace AI stores its workspace locally on your Mac.

Before connecting, the companion explains that it can read visible Marketplace listings, listing photos, page controls, and relevant conversation text. It passes this information to the local Marketplace AI app and, when required for an enabled task, to the AI provider selected in Marketplace AI through its installed command line client. You can disconnect at any time.

Marketplace AI does not read cookies, saved passwords, payment cards, or general browser history. It does not sell data or use Marketplace data for advertising.

Marketplace AI is free and open source, built by Floss and Pixel. Learn more at https://flossandpixel.com. Google, Meta, OpenAI, and Anthropic do not sponsor or endorse it.

## Category

Shopping

## Language

English

## Privacy policy

https://github.com/ahmedbafagih/vector-marketplace/blob/main/PRIVACY.md

## Support page

https://github.com/ahmedbafagih/vector-marketplace/issues

## Homepage

https://flossandpixel.com

## Single purpose

Connect the user's selected Facebook Marketplace pages to the local Marketplace AI desktop app so Marketplace AI can perform the Marketplace inventory, sourcing, listing, conversation, and pickup tasks the user enables.

## Permission justifications

### nativeMessaging

Connects the Chrome companion to the locally installed Marketplace AI desktop helper. Marketplace observations and user-approved actions travel through this local connection.

### scripting

Reads visible controls and content on the connected Marketplace tab and performs only the page actions requested by the local Marketplace AI workflow.

### storage

Stores local connection status so the companion can recover after Chrome or Marketplace AI restarts. It does not store conversation history in extension storage.

### alarms

Maintains and checks the local native connection without continuously running the service worker.

### Host permissions

Access is limited to Facebook domains used by Marketplace and Messenger. The extension needs these hosts to observe the Marketplace pages selected by the user and perform the enabled workflow actions. It does not request access to unrelated websites.

## Data use declarations

- Website content: Marketplace listing information, listing photos, controls, and relevant conversation text.
- Personally identifiable information: Names, profile links, and pickup addresses visible in relevant Marketplace content.
- Personal communications: Marketplace messages relevant to the enabled workflow.
- Authentication information: Not collected.
- Financial and payment information: Not collected.
- Web history: Not collected.
- Location: Pickup locations appearing in Marketplace or entered in Marketplace AI may be used for the user's local distance calculations. The extension does not request device geolocation.
- Data sale: No.
- Advertising use: No.
- Human access: No automatic access by the developer or contributors.

The data is used only for the extension's single purpose. Relevant task data may be passed from the local Marketplace AI app to the AI provider the user selects. That provider's terms and privacy settings apply.
