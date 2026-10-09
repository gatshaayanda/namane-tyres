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

Do not require a customer account just to request help.

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
- Do not automatically create Firebase Auth users from contact imports.
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
- For media offline, show a useful cached poster and a clear message that playback needs a connection. The public page, request form and queued-request workflow must remain usable without the video.
- When media/cache routing or customer-facing shell assets change, bump the service-worker cache version so stale installed-PWA assets are removed on activation. Avoid automatically replacing an active session without the existing update flow.
- Test the public homepage and job-share page at narrow mobile widths (320, 360, 390 CSS px), in a normal browser and installed PWA, online and offline. Verify there is no horizontal page overflow, text is readable, controls are thumb-sized, and the correct page is loaded.
- Verify the video over a real network with play, pause, seek and reconnect; then confirm offline behavior is graceful. Source code and a successful GitHub push alone do not verify production behavior.
- Location capture is optional. Try a quick network-assisted fix before high-accuracy GPS, give the browser time to prompt, explain permission/Location Services failures plainly, and always allow a text landmark fallback. Never block request submission because GPS failed.
