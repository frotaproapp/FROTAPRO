import * as admin from "firebase-admin";
import { onSchedule } from "firebase-functions/v2/scheduler";

export const dailyBackup = onSchedule("every day 02:00", async () => {
  const db = admin.firestore();

  const snapshot = await db.collection("tenants").get();
  const backup: any = {};

  snapshot.forEach(doc => {
    backup[doc.id] = doc.data();
  });

  await db.collection("backups").add({
    type: "AUTOMATIC",
    data: backup,
    createdAt: new Date().toISOString()
  });

  // Atualiza status do sistema para o painel
  const countSnap = await db.collection("backups").count().get();
  
  await db.doc("system_status/backup").set({
    lastBackupAt: new Date().toISOString(),
    health: "OK",
    retentionPolicy: "90 Dias",
    totalBackups: countSnap.data().count
  }, { merge: true });
});