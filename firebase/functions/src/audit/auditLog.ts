import * as admin from "firebase-admin";

export async function auditLog(
  action: string,
  details: Record<string, any>,
  uid: string
) {
  await admin.firestore().collection("audit_logs").add({
    action,
    details,
    executedBy: uid,
    executedAt: new Date().toISOString()
  });
}