# NAMANE TYRES — Agent Operating Contract

## Product
Namane Tyres is the real customer-facing digital front door and lightweight operating surface for Thapelo Namane Tyre Fitting Business in Gaborone, Botswana.

Business location:
- Plot 16739, Gaborone West Phase 1, Gaborone, Botswana
- Roadside, opposite Padre Pio Medical Centre

Core services: tyre fitting, puncture repair, pressure checks, tyre sales, light wash services and roadside assistance.

This is a real small-business product, not a demo, template, QA app, or generic SaaS.

## Roles
- Product owner / final reviewer: user
- Technical navigator + implementation: ChatGPT through repository tooling
- GitHub is the source of truth
- No Codex dependency

## Workflow
START → INSPECT → BUILD → VERIFY → CHECKPOINT → CONTINUE/RECOVER.

Golden rule: **Unexpected result = STOP → inspect reality → then act.**

Before changing code, inspect the repository, Git state, Firebase configuration, deployed state when relevant, and the actual business workflow. Do not blindly patch production.

## Product model
Customer → Request Assistance / Service Enquiry → Owner → Job → Complete

Tyre inventory → Customer enquiry → Request → Job / Sale

First useful workflow:
1. Customer opens Namane Tyres.
2. Customer chooses Request Help.
3. Customer provides name, phone, vehicle, problem, notes and location where useful.
4. The app truthfully saves the request online or queues it offline.
5. Owner sees the request in Operations.
6. Owner accepts it and moves the job through the real work.
7. Job is completed.

## Public customer experience
The public site must identify Namane Tyres and its Gaborone location, make Request Help prominent, explain real services without inventing prices or guarantees, provide direct phone/WhatsApp fallbacks when configured, work on a phone first, and remain useful when connectivity is poor.

The customer should not have to complete a long manual registration just to start. A Firebase anonymous session may be created automatically for low-friction customer features. An anonymous UID is temporary browser/account identity, not proof of phone ownership or contact membership. Never silently attach an anonymous session to a contact or job by guessing a phone number. Preserve a no-login Request Help fallback if anonymous auth is unavailable.

Do not invent opening hours, prices, tyre brands, stock, testimonials, promotions, response times, emergency guarantees, or contact numbers.

## Request workflow
Operational statuses:
- New
- Accepted
- In Progress
- Ready / Awaiting Customer
- Complete
- Cancelled

A request submission is not the same as business acceptance.

Customer-facing truth:
- Online save: **Sent to Namane Tyres.**
- Offline queued save: **Saved on this phone — waiting to send.**
- Failure: explain that the request was not recorded and provide a human fallback.

Never say the business received a request until synchronization/receipt is actually established.

Capture GPS only with user permission. If location permission is denied or unavailable, the request can still be submitted with a useful text location/notes.

## Offline-first PWA
Offline is a product capability, not a fake status.

Maintain:
- installable PWA manifest
- registered service worker
- cached app shell
- offline route
- cached public assets after successful visits
- Firestore persistent local cache for structured data
- queued customer request writes through Firestore supported offline persistence
- visible online/offline state
- truthful queued/synchronized wording

The service worker must not cache private Firebase API responses indiscriminately. Do not cache large videos or media blobs in the app shell. Cache public static assets only after successful network responses.

Previously visited public pages remain available. A new request may be queued by Firestore when supported. Admin data may be readable from Firestore local cache after it has previously been loaded. Actions requiring connectivity must say so rather than pretending they completed.

## Firebase
Use the dedicated Firebase project: namane-tyres.

Never use Meating Place, Avram, Translend, AdminHub, or another project's Firebase identifiers, credentials, collections, seed data, or rules.

Browser Firebase configuration must use NEXT_PUBLIC_FIREBASE_* environment variables. Never commit .env.local, service-account JSON, or private credentials.

## Firestore authorization
Recommended boundary:
- public customer request create only, with strict field validation
- customer cannot read/update/delete requests
- admins/{uid} is provisioned outside the client with role owner or staff
- owner/staff can read and update operational requests
- inventory and other private operational data are admin-only unless a future public read requirement is explicitly designed

Never weaken rules to hide a UI or configuration problem.

## Data integrity
Keep request records understandable after the business changes its catalogue. Preserve customer-entered service/tyre text or snapshots rather than depending only on mutable current inventory.

Use server-authoritative timestamps where practical, but do not make the offline customer flow depend on a server round trip just to display a truthful local queued state.

## Media
Business media may live under public/namane-assets/ for stable static content or UploadThing when owner-managed job media is needed. Do not put large media blobs in Firestore. Do not make a child/family image the public identity of the business or expose unnecessary personal information.

## Admin / Operations
/admin is the real owner/staff operations surface. Keep it small and practical: incoming assistance requests, request details and contact actions, status changes, tyre inventory and useful operational notes.

Do not build a generic CRM, ERP, accounting system, fake payment flow, or customer account platform.

## Technical baseline
- Next.js 15
- React 19
- TypeScript
- Firebase Auth
- Firestore with persistent local cache
- Firebase Storage where actually needed
- Vercel
- installable PWA + service worker
- Vercel Analytics / Speed Insights

## Build discipline
Before a meaningful checkpoint run npx tsc --noEmit, npm run lint and npm run build. Do not run npm audit fix --force as blind cleanup. Never commit .env.local or private Firebase credentials.

## Repository boundaries
Other Admin Hub projects may be technical references only. Active domain terminology, metadata, routes, navigation, Firebase config, service worker cache names and customer-facing errors must be Namane Tyres.

## Final review
A feature is complete only when it represents the real Namane Tyres business, the customer flow is understandable, offline/online states are truthful, Firebase uses the dedicated namane-tyres project, Firestore rules protect private data, no fabricated business facts were introduced, checks are addressed, and the deployed result matches customer → owner → job.

The goal is a useful digital front door and lightweight operating surface for a real tyre business — not the most complicated system possible.


## Contacts and admin directory
Contacts are an owner-managed business directory, not app users:
- Existing WhatsApp/business contacts may be imported by an authorized admin.
- A contact becomes operationally relevant when a request/job is associated with the same phone number.
- Do not automatically create Firebase Auth users from contact imports. Opening the public app may create a temporary anonymous Firebase session, but importing contacts does not pre-create accounts or authenticate those people.
- Owner/staff can add, edit, search and delete contacts from /admin.
- Contact history is derived from assistance requests matching the normalized phone number.
- WhatsApp VCF imports are parsed locally in the authenticated browser.
- Contact photos are intentionally ignored.
- The original VCF and generated contact exports are private and must never be committed.

The inspected WhatsApp export contained 112 vCards, 112 valid Botswana phone numbers, 95 unique phone numbers and 16 duplicate phone-number groups. Re-importing must update existing phone-keyed records rather than create duplicates.

## Admin authentication
- V1 uses Firebase email/password authentication only.
- Google sign-in is intentionally deferred.
- Access requires an authenticated UID with admins/{uid}.role equal to owner or staff.
- Auth users and their admin role documents are provisioned outside the public client; the app must not expose self-registration or client-side admin provisioning.



## Jobs, progress sharing and customer-facing updates
Jobs are the owner-controlled work record behind real customer work. A job can be created manually, from an assistance request, or from a known contact.

Job workflow:
- New
- Accepted
- In Progress
- Ready / Awaiting Customer
- Complete
- Cancelled

A job records customer name/phone, vehicle, service, problem, notes, amount, payment status and operational timestamps as they are added. Do not expose the customer's phone number on the public job view.

Each job receives an unguessable publicShareId. The owner can copy a /job/share/{publicShareId} link and send it to the customer. The public page contains only customer-safe job information and progress photos explicitly uploaded for that job.

### Job progress photos
- Admin/staff can add progress photos from the job record.
- Images are compressed on the device before upload to reduce mobile data/storage use.
- Online: photo uploads to UploadThing and its returned public CDN URL plus metadata are written to the private job record and public share record.
- Offline: the compressed photo is queued in browser IndexedDB and clearly shown as waiting to sync. It is uploaded automatically when connectivity returns or manually via Sync queued photos.
- UploadThing is the media store for job progress photos. Never put image blobs in Firestore.
- Public job progress images are intentionally readable without authentication because the customer share link is the access mechanism. The share ID must be unguessable and public pages must not expose phone numbers or private admin notes.
- Do not claim a photo was shared/uploaded until the Storage upload and Firestore metadata write succeed. Offline wording must say it is saved on this phone and waiting to sync.
- Service worker/app-shell caching must not cache job media blobs. UploadThing CDN URLs are deliberately public because the unguessable customer share ID is the access mechanism.

### Job sharing SOP
1. Create/open the job.
2. Confirm customer, vehicle and work details.
3. Save the job.
4. Copy the customer progress link or open the shared view to verify it.
5. Add progress photos with short useful captions such as "Puncture found" or "New tyre fitted".
6. Send the same link to the customer through the normal human channel, such as WhatsApp.
7. Update the job status as physical work changes.
8. Before Complete, record amount/payment status where known.
9. Leave the customer progress page showing the latest safe progress information.

### Operational principle
The app is the record of work, not a replacement for human communication. WhatsApp/phone remain the human channel; the share link gives the customer a clear, current view of work progress.


## Offline hardening checkpoint — October 2026
- The PWA has separate shell, static and public caches with bounded retention.
- The service worker never caches /api/ responses or Firebase/private operational data. Firestore persistent local cache remains the source of truth for structured offline data.
- Admin route shells may be cached so an installed Operations app can open without internet; authentication and Firestore authorization still control access and private data.
- Public job-share pages use bounded network-first caching because their projection is deliberately customer-safe and contains no phone number.
- Service-worker installation is non-blocking: shell precaching is best effort and does not require a large video/media download.
- Service-worker updates must not rely on automatic skipWaiting. The existing explicit update message is retained so an active work session is not unexpectedly replaced.
- Browser persistent storage is requested best-effort; the app remains functional when the browser declines.
- Job progress photos are compressed before storage, kept out of Cache Storage, and queued in IndexedDB when offline. The photo outbox is bounded to 40 items and reports when full rather than silently consuming unbounded device storage.
- Offline wording must distinguish: saved on this phone, waiting to sync, synced/uploaded, and received by Namane Tyres. A customer share link is not considered server-visible until the job has synchronized.
- Do not add Background Sync as a dependency unless a concrete requirement appears; the current reconnect/online flush path is deliberately simple and explicit.

## Customer introduction and referral launch — October 2026

The contact directory is an outreach list, not a permission to expose individual customer jobs or to send unsolicited repeated messages. Treat the launch as a useful service introduction, not a pressure campaign.

### Safe sharing rules
- The public URL `/job/share/{shareId}` is specific to one job. It may expose that customer's progress, photos and messages to anyone who receives the link. **Never send a job-specific share link to the full contacts list.** Send it only to the customer associated with that job.
- For a general introduction, share the public homepage `https://namane-tyres.vercel.app/` or a dedicated general introduction page. Do not use a live customer's job as a demo or testimonial without their explicit permission.
- Do not claim that customers have praised/recommended the app unless the business has verified, permissioned testimonials. Prefer a concrete explanation of what the service lets customers do.
- Send a single concise introduction first. Use WhatsApp one-to-one or an appropriate opt-in broadcast/list; respect replies, opt-outs and platform rules. Do not scrape/import extra contacts or repeatedly message people who do not engage.
- Make the value clear: customers can request tyre help, share their location when available, and follow progress on a job through a private link supplied by Namane Tyres. The app does not guarantee emergency response, immediate acceptance, live tracking or push delivery.
- CTA hierarchy: view Namane Tyres → request assistance when needed → save the contact/link. Avoid asking customers to install an app before they can understand or use the service.
- Measure launch quality through actual signals: link clicks where privacy-respecting analytics are available, assistance requests, requests that reach the owner, job-share page visits and customer replies. Do not invent engagement counts or testimonials.

### Media reliability and PWA verification
- Keep the app shell, CSS, JavaScript, icons, manifest and lightweight public poster images cacheable for offline use.
- Do not route video/audio through cache-first handling. Preserve browser-native HTTP Range requests for media; a full cached response can interfere with seeking and playback. Do not precache the large tyre-work video or claim it is available offline unless an explicitly tested, size-bounded offline media strategy is implemented.
- For media offline, show a useful cached poster and a clear message that playback needs a connection. The public page, request form and queued-request workflow must remain usable without the video. The landing-page WorkVideo component explicitly switches to the cached poster while offline and offers a retry after connection returns or a media load error.
- When media/cache routing or customer-facing shell assets change, bump the service-worker cache version so stale installed-PWA assets are removed on activation. Avoid automatically replacing an active session without the existing update flow.
- Test the public homepage and job-share page at narrow mobile widths (320, 360, 390 CSS px), in a normal browser and installed PWA, online and offline. Verify there is no horizontal page overflow, text is readable, controls are thumb-sized, and the correct page is loaded.
- Verify the video over a real network with play, pause, seek and reconnect; then confirm offline behavior is graceful. Source code and a successful GitHub push alone do not verify production behavior.
- Location capture is optional. Try a quick network-assisted fix before high-accuracy GPS, give the browser time to prompt, explain permission/Location Services failures plainly, and always allow a text landmark fallback. Never block request submission because GPS failed.


## Customer launch: one-link introduction and install/update flow — October 2026

### Recommended launch method
- The public homepage is the single general-purpose link: https://namane-tyres.vercel.app/ . Do not distribute any /job/share/{shareId} link as a general introduction; each such link belongs only to the customer/job it identifies.
- The homepage's “Share with a driver” / “Share Namane Tyres” action opens WhatsApp's share-to-contact flow with a prefilled message. The owner chooses recipients and presses Send; the site must not silently send messages or read/automate the phone's contacts.
- For introducing the same link to the existing customer list, the owner may use a WhatsApp Business broadcast list if appropriate. Broadcast delivery depends on WhatsApp's rules and recipient settings (including whether recipients have saved the sender's number); do not promise delivery to all 95. Otherwise, use one-to-one messages or an existing customer group where messages are appropriate and expected. Respect requests not to receive further messages.
- Send one short service-led introduction. Do not invent testimonials, imply an app-store download, require installation before viewing the site, or claim push notifications are guaranteed. Explain that the link opens the website/PWA; users can save it to the home screen if their browser supports it. The service remains usable without installation.
- Suggested copy: “Hi, it’s Thapelo from Namane Tyres. I’ve made it easier to reach me for tyre help in Gaborone West. Open this link to see services or request help: https://namane-tyres.vercel.app/ . You can save it to your phone’s home screen so it’s easy to find next time. If anything is confusing, reply and tell me. Thanks.”

### Install, refresh and update UX
- Provide a persistent, accessible “Save Namane Tyres to phone” action for browser users. Use the native install prompt when the browser provides it; otherwise explain Android browser-menu installation and iPhone Safari → Share → Add to Home Screen. Never imply installation is required to use the service.
- Provide a visible “Refresh app” action that checks the service-worker registration for updates, applies a waiting update through the existing explicit message, and reloads the current page so the newest deployed screen can load. Do not disable pinch-to-zoom.
- When changing the service worker's caching strategy or app-shell assets, bump CACHE_VERSION so obsolete shell/static/public caches are deleted on activation. Keep video/audio network-only and preserve native Range requests.
- Do not announce an update is available until the service worker has installed it; do not claim the refresh worked unless the page actually reloads and the deployed version is verified.

### Launch acceptance checklist
1. Confirm the latest production deployment is READY before asking the owner to distribute the link.
2. Open the generic homepage in Android Chrome, iPhone Safari if available, and the installed PWA; confirm the page fits a 320–390 CSS-pixel viewport with no horizontal overflow and readable service cards, nav and controls.
3. Confirm the install action either opens the browser's native prompt or shows accurate manual instructions; verify the installed app can be opened from the home screen.
4. Tap “Refresh app”; verify it reloads and can activate a waiting service-worker update without deleting unsynced customer work.
5. Test video playback and seeking online, then verify the cached poster/fallback works offline without blocking the request form.
6. Test location permission granted, denied and unavailable; manual landmark entry and request submission must continue to work.
7. Send the campaign only with the general homepage link. Test a customer-specific job link only with the matching customer.
8. Record real outcomes (replies, requests, install feedback and job-link usage); do not report 95 users simply because 95 messages were sent. Count actual installs/active users only when measurable and consented.

## WhatsApp launch procedure for the existing 95-customer list — October 2026

The owner uses an ordinary WhatsApp account, not the WhatsApp Business Platform/API. Prefer native WhatsApp tools over browser extensions, unofficial bulk-senders, contact scraping, or a customer group that exposes all recipients to one another.

### First choice: one WhatsApp broadcast
- On Android, open WhatsApp on the owner's phone → Chats → three-dot menu → Broadcast lists → New broadcast (or New list, depending on app version) → select the relevant customer contacts → tap the checkmark → paste/send the introduction once.
- In WhatsApp Business, look under Tools → Business broadcasts, or Chats → Business Broadcast; the available menus and features vary by version/account.
- A standard broadcast list supports up to 256 contacts, so 95 is within the list-size limit. This does **not** guarantee 95 deliveries: WhatsApp says broadcast recipients must have saved the owner's number in their address book. Some accounts/regions may also show additional broadcast limits or paid business-broadcast options; follow the limits displayed in the owner's own app.
- A broadcast is preferable to a group: each recipient receives a private individual message, recipients cannot see the other customers, and replies return privately to the owner.
- Send from the phone app. Standard broadcast lists are not supported in WhatsApp Web/Desktop.
- Before sending, check that the list contains the intended existing customers and that the text contains only the general public homepage link: https://namane-tyres.vercel.app/ . Never include a /job/share/{shareId} link in a general campaign.

### Fallback for customers not reached by broadcast
- If some customers have not saved the owner's number, the broadcast may not reach them. Where a customer relationship and messaging expectations make it appropriate, send the same prepared text in an individual chat; this is the reliable fallback but requires one send per chat.
- The homepage's WhatsApp share link can prefill the introduction and let the owner choose a recipient in WhatsApp. Do not assume it can multi-select and send to all 95 in one action; verify the actual chooser on the owner's phone. Do not automate 95 separate sends through unofficial tools.
- Do not create a group merely to avoid the broadcast limitation; group members can see one another and replies. Use an existing group only when customers already expect group communication and have agreed to it.
- If the app shows a broadcast quota, payment prompt, warning, or restriction, stop and follow the in-app options rather than attempting to evade it.

### Recommended message and install expectation
“Hi, it’s Thapelo from Namane Tyres. I’ve made it easier to reach me for tyre help in Gaborone West. Open this link to see the services or request help: https://namane-tyres.vercel.app/ . If you use it often, you can save it to your phone’s home screen for quicker access. You can still use it in your browser without installing. If anything is confusing, just reply and let me know. Thanks.”

- This is a website/PWA link, not a Play Store/App Store download. Installation is optional and browser/device dependent; the page must explain how to save it to the home screen after it opens.
- Do not promise every recipient will install, respond, receive push notifications, or become an active app user. Sending 95 messages means 95 attempted introductions, not 95 installs or active users.
- Suggested launch tracking: sent by broadcast, known replies, actual assistance requests, customer feedback, and installation feedback. Do not infer delivery or installation from the send action alone.
- Public guidance checked against WhatsApp Help Center articles “How to use broadcast lists” (https://faq.whatsapp.com/861663048350950/) and “How to use broadcast lists on the WhatsApp Business app” (https://faq.whatsapp.com/653415899610349/), plus WhatsApp’s click-to-chat instructions (https://faq.whatsapp.com/5913398998672934/). Re-check these official instructions if WhatsApp's menus or limits change.


## Customer invitation onboarding — October 2026 (supersedes guest-first campaign assumptions)

The product owner wants the 95 existing customer contacts introduced in one WhatsApp broadcast, and wants recipients to enter the actual Namane Tyres web app/onboarding—not a generic brochure or an app-store listing. Follow The Plug's principles for a branded, low-friction mobile journey, but adapt the content and account model to Namane Tyres.

### Required customer journey
1. Thapelo sends one WhatsApp broadcast containing the single general onboarding URL: https://namane-tyres.vercel.app/ . A broadcast sends the same link to all selected recipients; it cannot give each recipient a different private account token.
2. The link opens a responsive, Namane-branded welcome/onboarding experience. It quickly explains tyre services, Request Help, job progress when applicable, and why keeping Namane Tyres on the home screen is useful.
3. Customers can enter and use the web app before deciding whether to install. Do not show a blocking install prompt on ordinary first visit. Explain the benefit, then offer a clear optional install action; use the browser's install prompt where supported and correct platform-specific steps elsewhere.
4. Approved low-friction customer model: on the first public app visit, automatically create/reuse a persistent Firebase anonymous-auth session when the provider is enabled. Do not force account creation, phone OTP, or PWA installation before the customer can browse or request help. If anonymous auth is unavailable, keep the existing request-help path working and show a truthful account-access status.
5. Anonymous auth creates a stable device/browser account, not a verified identity. It must never be treated as proof that a person owns a named contact or job. Do not match a session to the imported 95 contacts by guesswork or by a phone number that has not been verified.
6. Store the anonymous UID on new assistance requests and let that signed-in UID read only its own requests. Do not let customers update/delete operational requests, read contacts/inventory, access /admin, or read another customer's requests. The /admin surface remains owner/staff only.
7. Existing jobs remain accessible through the unguessable job-specific /job/share/{shareId} link sent to the actual customer. Do not silently attach existing jobs to a new anonymous UID; add a verified ownership/linking flow if that becomes a requirement.
8. A single WhatsApp broadcast uses one generic onboarding URL. It cannot safely identify 95 recipients as 95 different named accounts. Do not put phone numbers, contact IDs, job IDs, or private data in a reusable public URL. A forwarded link must not let another person impersonate the intended customer.

### Campaign success and truthful measurement
- Sending a broadcast is an attempted introduction, not proof of delivery, account creation, app installation, notification permission, or active use.
- Track actual outcomes only from reliable events: verified account created/connected, request submitted and confirmed, real install outcome where supported, and voluntary feedback.
- Do not use fabricated reviews or imply that all 95 customers are already users. Invite customers to open the app, see what it does, and optionally install it for one-tap return access.
- Keep the campaign message short, human and useful. The link should open the real customer journey, not the single-job progress link.

### PWA refresh and responsive acceptance
- The current PWA registration component includes a visible “Refresh app” action and a waiting-update action. Preserve these; do not add a duplicate refresh control. Verify the control's actual behaviour after a READY deployment.
- A refresh must check the service-worker registration, safely activate a waiting worker where appropriate, and reload the current route. It must not erase queued requests, queued photos, or other unsynced work.
- Verify responsive layout separately from PWA refresh: test at 320, 360, 390 and 430 CSS-pixel widths, portrait and landscape, normal zoom, browser and installed-PWA display modes. Confirm no horizontal overflow, readable text, usable navigation/buttons, and correctly scaled images/video. Never disable pinch-to-zoom.
- Do not claim these customer onboarding, refresh, or responsive checks passed solely because source code exists. Require successful build/deployment and record actual verification evidence.


## Approved customer sessions and BOEMO-style notifications — October 2026
- Public customer routes automatically attempt Firebase anonymous authentication after first load. Firebase Console must have Authentication → Sign-in method → Anonymous enabled; code cannot enable a Firebase provider in the Console.
- The anonymous UID is device/browser-local and is not a verified phone number or proof of contact ownership. It supports a customer’s own request history only; it must never grant Operations access or reveal another customer’s work.
- New assistance requests may include customerUid equal to the current Firebase UID. Firestore rules permit customers to read only their own requests; only owner/staff can update/delete operational requests or access contacts, inventory and jobs.
- Existing jobs remain accessible through the unguessable job-specific link. Do not auto-link legacy jobs to a new anonymous UID based on name/phone alone.
- BOEMO-style web push: request browser permission only after the owner explicitly chooses Enable alerts; register the FCM token through an authenticated owner/staff API; send a test notification on demand; send a new-request alert only after the request is actually written online; remove invalid tokens. Customer job-reply push remains scoped to that job’s share link.
- A server response indicating FCM accepted a message is not proof the OS displayed it. Test with the app in the background and verify on the actual device. If the VAPID key, Firebase Admin credentials, FCM API or notification permission is missing, say which prerequisite is missing rather than reporting success.
- The PWA refresh control must check for a waiting service worker and safely reload the current route without clearing queued requests or photos. Existing responsive CSS is not proof of responsive behavior: test 320, 360, 390 and 430 CSS-pixel widths, landscape, browser mode and installed PWA; never disable pinch-to-zoom.
- Firebase Auth provider settings and Firestore rules are Firebase project configuration, not Vercel build artifacts. Deploy/test the updated rules separately before claiming customer request history works in production.


## Customer onboarding and launch campaign — October 2026
- Use Firebase Anonymous Authentication for frictionless customer access where needed. Anonymous users are not verified identities and may lose continuity if browser data is cleared or they change devices. Offer a deliberate account-linking/recovery path before promising durable accounts.
- Never grant customers access to /admin, /admin/jobs, contacts, inventory, private jobs, admin notification tokens, or owner/staff APIs. Operations requires a verified Firebase ID token and an admins/{uid} role of owner/staff, enforced server-side and by Firestore rules.
- Job-share URLs are unguessable, job-specific links. Never use them as the general campaign URL. The public introduction link is https://namane-tyres.vercel.app/.
- For the 95 unique customer numbers, the owner can create a WhatsApp Broadcast List and select the contacts. Broadcast delivery generally depends on recipients having saved the sender's number. Test with a few customers first, then send to the intended list; use WhatsApp's normal individual follow-up for anyone not reached. Do not automate unsolicited messages or claim every recipient received it.
- Campaign message: "Hi, it's Thapelo from Namane Tyres. I've made it easier to reach me for tyre fitting, puncture repairs and tyre help in Gaborone. Open this link to view services or request help whenever you need it: https://namane-tyres.vercel.app/. You can optionally save Namane Tyres to your phone's home screen for next time. If anything is unclear, reply here and let me know. Thank you."
- The link opens a website/PWA, not an app-store listing. Customers can browse and request help immediately; installation is optional and should be offered after the service value is clear. Do not invent testimonials, prices, promotions or guarantees.

## PWA refresh and responsive verification
- Keep an accessible Refresh app/version-check control and an explicit Update app action when a service worker is waiting. Check mobile layouts for overlap with offline banners, install controls, message composers and primary actions.
- Refresh checks the service-worker registration and reloads the page; it cannot guarantee that the current deployment is healthy or live. Do not treat a cached page as proof of deployment.
- Test the homepage at 320, 360, 390 and 430 CSS-pixel widths plus desktop: navigation, cards, media, forms, tap targets, overflow, keyboard focus and zoom. Never disable pinch-to-zoom.
- Keep audio/video network-only and preserve native HTTP Range requests. Do not cache large media or partial responses in the PWA shell.
- Before campaign launch, identify the exact GitHub commit and matching Vercel production deployment. Do not recommend distribution until production is READY and a real-phone smoke check confirms the main flow.

## Namane push notifications
- Use BOEMO only as a UX/architecture reference. Use Namane's own Firebase project, VAPID key, service worker, server credentials and scoped token records.
- The existing Operations alert is for Thapelo's device and new assistance requests. FCM server acceptance does not prove the operating system displayed a notification.
- Customer reply notifications must be scoped to the customer's job-share ID and registered token. Never send private job updates to a global topic or another customer's device. Request permission only after an explicit user action and explain browser/OS controls.
- Verify real delivery on a phone in background state, correct notification click destination, stale-token handling and revocation before claiming customer push is live. Inspect actual job/message write paths before adding server triggers; avoid duplicate sends.


## Existing-customer welcome journey and job notifications — October 2026

### One-link customer introduction
- Use **https://namane-tyres.vercel.app/welcome** as the campaign link for the existing customer list. It is a general customer welcome page, not a job link and not an app-store listing.
- The page must explain the service first, then offer Request Help, My requests, and optional home-screen installation. Never block browsing or requesting help behind an install prompt.
- The public PWA starts a Firebase anonymous session when supported. Treat this only as a lightweight browser-scoped identity: it is not phone-number verification, does not prove the visitor is one of the imported contacts, does not unlock an existing job, and may not be recoverable after browser data is cleared or the user changes device. Do not claim an anonymous session is a permanent, cross-device account.
- Existing jobs remain accessible through the unguessable per-job `/job/share/{shareId}` link. Never replace those links with the general welcome URL or send one customer's job link to the whole list.
- Use the generic welcome link in the WhatsApp broadcast introduction. Send once; reply normally to customers who engage. The welcome page offers no invented discounts, VIP entitlements, guaranteed response times, fake testimonials, or false urgency.
- Suggested WhatsApp message: “Hi, it’s Thapelo from Namane Tyres. I’ve made it easier for you to reach Namane Tyres whenever you need tyre help. Open your customer welcome link: https://namane-tyres.vercel.app/welcome. You can see our services and request help when needed. No app-store download is needed; you can optionally save it to your phone’s home screen for next time. For an existing job, keep using the individual progress link I sent you. Reply here if you need anything. Thank you.”

### Customer push notifications
- The existing job-progress page asks the customer before registering a push token, scoped to `publicJobs/{shareId}/notificationTokens`. Keep that consent boundary.
- When an Operations user changes a job's status, send a best-effort FCM notification only to tokens registered for that exact job share link. The notification should open the matching `/job/share/{shareId}` page.
- A saved job status is authoritative; push delivery is a separate best-effort side effect. If FCM fails, keep the job update saved, report the failure to server logs, and do not claim the OS displayed a notification.
- Admin request alerts and customer job-progress notifications are separate audiences. Never broadcast job details, customer names, or private progress to the whole 95-contact list.
- Verify by registering notifications from a test job link, changing that job's status while online, checking the device notification and link target, then confirming status changes still save when push is unavailable.

### Launch verification checkpoint
- Confirm Vercel production is `READY` before the owner sends the campaign.
- Test `/welcome` at 320, 360 and 390 CSS-pixel widths; browse, Request Help, My requests, install guidance and Refresh app must remain usable without horizontal overflow.
- Anonymous sessions must fail gracefully if Firebase Anonymous Authentication is disabled or unavailable; public browsing and Request Help must remain accessible.
- Customer request history is browser-scoped until a recoverable account or verified identity-linking flow is deliberately implemented. Do not merge records based only on a typed phone number.


## Owner-friendly analytics — October 2026

- Namane Tyres owner analytics live at `/admin/analytics`, linked from the Operations header. Use the BoardSignal founder-side dashboard as a clarity/reference pattern, but keep Namane reporting focused on website visitors, page views, booking-page views, call/WhatsApp taps, saved customer requests, job creation/completion/payment status, and job-progress-link activity.
- Analytics dashboard API is owner-only: verify Firebase ID tokens server-side and require `admins/{uid}.role === "owner"`. Do not expose customer names, phone numbers, private job details, job-share IDs, or analytics records to staff or public visitors.
- Public event tracking is allowlisted and aggregate-oriented. Store only a random first-party browser identifier, normalized page category, event name, referrer hostname, device category, and timestamp. Never store IP addresses, full referrer URLs, customer contact information, query strings, or job-share IDs in analytics events.
- Website visitor/page-view counts begin after the tracking release and must not be described as historical Vercel Analytics totals. Clearly distinguish period counts from all-time operational totals. Count actual saved requests from `assistanceRequests`; opening the booking page is not a completed booking. A call/WhatsApp tap is not proof that a conversation happened.
- Do not change Firestore client security rules for analytics. Write event records through the server-only Firebase Admin SDK. Validate event names, normalize paths, validate same-origin requests where Origin is present, bound payload size and event frequency, and keep dashboard responses private/no-store.
- Before claiming the feature is live, confirm the commit is on `main`, wait for the matching Vercel production deployment to become READY, inspect build/runtime errors if it fails, then verify owner-only access, staff denial, event recording, and the 7-/30-day report on production. Do not ask the owner to QA while the matching deployment is still building.
