import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";
import { adminAuth, adminDb } from "@/lib/firebase/admin";

const f = createUploadthing();

async function requireNamaneAdmin(req: Request) {
  const header = req.headers.get("authorization");
  const token = header?.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) throw new UploadThingError("Unauthorized");
  try {
    const decoded = await adminAuth().verifyIdToken(token);
    const role = await adminDb().doc(`admins/${decoded.uid}`).get();
    if (!role.exists || !["owner", "staff"].includes(String(role.data()?.role))) {
      throw new UploadThingError("Namane Tyres Operations access required.");
    }
    return { uid: decoded.uid };
  } catch (error) {
    if (error instanceof UploadThingError) throw error;
    throw new UploadThingError("Unauthorized");
  }
}

export const ourFileRouter = {
  jobProgress: f({ image: { maxFileSize: "4MB", maxFileCount: 1, minFileCount: 1 } })
    .middleware(async ({ req }) => requireNamaneAdmin(req))
    .onUploadComplete(async ({ metadata, file }) => ({
      uploadedBy: metadata.uid,
      url: file.ufsUrl,
      key: file.key,
    })),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
