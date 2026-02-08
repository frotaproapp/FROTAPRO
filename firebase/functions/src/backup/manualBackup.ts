import * as admin from "firebase-admin";
import { onCall } from "firebase-functions/v2/https";
import { requireSuperAdmin } from "../auth/requireSuperAdmin";
import { auditLog } from "../audit/auditLog";

export const manualBackup = onCall(async (request) => {
  const user = await requireSuperAdmin(request);

  const db = admin.firestore();
  const snapshot = await db.collection("tenants").get();
  const backup: any = {};

  snapshot.forEach(doc => {
    backup[doc.id] = doc.data();
  });

  await db.collection("backups").add({
    type: "MANUAL",
    data: backup,
    createdAt: new Date().toISOString()
  });

  await auditLog("MANUAL_BACKUP", {}, user.uid);

  return { status: "ok" };
});