import * as admin from "firebase-admin";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { requireSuperAdmin } from "../auth/requireSuperAdmin";
import { auditLog } from "../audit/auditLog";

export const restoreBackup = onCall(async (request) => {
  const user = await requireSuperAdmin(request);
  const { backupId } = request.data;

  if (!backupId) {
    throw new HttpsError("invalid-argument", "Backup não informado");
  }

  const db = admin.firestore();
  const backupSnap = await db.collection("backups").doc(backupId).get();

  if (!backupSnap.exists) {
    throw new HttpsError("not-found", "Backup inexistente");
  }

  const batch = db.batch();
  const data = backupSnap.data()!.data;

  for (const tenantId in data) {
    const ref = db.collection("tenants").doc(tenantId);
    batch.set(ref, data[tenantId]);
  }

  await batch.commit();

  await auditLog("RESTORE_EXECUTED", { backupId }, user.uid);

  return { restored: true };
});