import * as admin from "firebase-admin";
import { onSchedule } from "firebase-functions/v2/scheduler";

const MAX_DAYS = 90;

export const retentionPolicy = onSchedule("every day 03:00", async () => {
  const db = admin.firestore();
  const limitDate = new Date();
  limitDate.setDate(limitDate.getDate() - MAX_DAYS);

  const oldBackups = await db
    .collection("backups")
    .where("createdAt", "<", limitDate.toISOString())
    .get();

  const batch = db.batch();
  oldBackups.forEach(doc => batch.delete(doc.ref));
  await batch.commit();
});