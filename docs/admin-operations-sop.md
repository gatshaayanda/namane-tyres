# Namane Tyres — Operations SOP V1

## Purpose
Use the app as a simple work record so customer requests become visible jobs, progress can be shared, and completed work does not disappear into WhatsApp.

## Daily opening
1. Open Namane Tyres Operations.
2. Confirm Online/Offline state.
3. Review New requests.
4. Review open jobs.
5. Review unpaid jobs.
6. Check critical tyre stock.
7. Keep normal phone/WhatsApp communication available.

## Starting a job
1. Find the customer or create a contact.
2. Create a job for walk-ins, phone customers, or incoming requests.
3. Record customer name, phone, vehicle, service and the actual work/problem.
4. Save the job.
5. Copy the customer progress link.
6. Send the link through the normal customer channel when useful.

## While doing the work
1. Move the job to Accepted when the owner has taken it on.
2. Move to In Progress when physical work starts.
3. Add useful progress photos, not random photos.
4. Use short captions: "Puncture found", "Tyre removed", "New tyre fitted".
5. If offline, confirm the app says the photo is saved on the phone and waiting to sync.
6. Do not tell the customer a photo is online until it has synced.

## Closing the job
1. Move to Ready / Awaiting Customer when the physical work is done but customer action remains.
2. Record amount and payment status where known.
3. Move to Complete only when the work is actually finished.
4. Use Cancelled only when the job did not proceed.
5. Leave the customer progress page showing the latest safe status.

## Customer safety
The public progress link must never show the customer phone number or private admin information. Share only the job details and photos needed to explain progress.

## Offline rule
Firestore structured data may queue locally. Progress photos use a separate local IndexedDB queue because Firebase Storage uploads require connectivity. Never display "uploaded", "sent" or "received" when the app only has a local copy.

## Human communication
The app records and shares progress; it does not replace phone calls or WhatsApp. Use the customer link as a clear progress page, then communicate normally when a customer needs an answer, approval, payment or collection.
