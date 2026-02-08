
import admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n") : undefined
    }),
    databaseURL: process.env.FIREBASE_DATABASE_URL,
  });
}

const db = admin.database();

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Método não permitido." });

  try {
    const { tenantId, days, performedBy } = req.body;
    if (!tenantId) return res.status(400).json({ error: "tenantId é obrigatório." });

    const extraDays = days || 365;
    const newExpiry = Date.now() + (extraDays * 86400000);
    const serverTime = admin.database.ServerValue.TIMESTAMP;

    await db.ref(`tenants/${tenantId}/license`).update({
      status: "ACTIVE",
      expiresAt: newExpiry, // ✅ Timestamp numérico
      renewedAt: serverTime,
      renewedBy: performedBy || "MASTER_ADMIN",
    });

    const logRef = db.ref(`auditLogs/${tenantId}`).push();
    await logRef.set({
      action: "LICENSE_RENEWED",
      performedBy: performedBy || "MASTER_ADMIN",
      criadoEm: serverTime,
      details: { newExpiration: newExpiry, addedDays: extraDays }
    });

    return res.status(200).json({
      success: true,
      expiresAt: newExpiry
    });
  } catch (error) {
    console.error("Erro ao renovar licença:", error);
    return res.status(500).json({ error: error.message });
  }
}
