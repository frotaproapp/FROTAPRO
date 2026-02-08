
import admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') : undefined,
    }),
    databaseURL: process.env.FIREBASE_DATABASE_URL,
  });
}

const db = admin.database();

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Método não permitido" });

  try {
    const { userId, tenantId } = req.body;
    if (!userId || !tenantId) return res.status(400).json({ error: "IDs necessários" });

    // 🔍 Busca dados do usuário antes de apagar para limpar índices
    const userSnap = await db.ref(`users/${userId}`).get();
    const userData = userSnap.val();

    const updates = {};
    updates[`users/${userId}`] = null;
    updates[`indices/usersByTenant/${tenantId}/${userId}`] = null;

    // 🔥 Limpa índice de secretaria se existir
    if (userData && userData.secretariaId) {
        updates[`indices/usersBySecretaria/${userData.secretariaId}/${userId}`] = null;
    }

    await db.ref().update(updates);

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Erro ao remover usuário:", error);
    return res.status(500).json({ error: error.message });
  }
}
