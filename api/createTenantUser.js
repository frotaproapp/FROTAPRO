
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
    const { id, nome, email, senha, tenantId, role, secretariaId } = req.body;

    if (!email || !tenantId) return res.status(400).json({ error: "Dados incompletos." });

    let userRecord;
    let isNewUser = false;

    if (id) {
        userRecord = await admin.auth().getUser(id);
    } else {
        try {
            userRecord = await admin.auth().getUserByEmail(email);
        } catch (err) {
            if (err.code === "auth/user-not-found") {
                userRecord = await admin.auth().createUser({ email, password: senha, displayName: nome });
                isNewUser = true;
            } else throw err;
        }
    }

    const uid = userRecord.uid;
    const serverTime = admin.database.ServerValue.TIMESTAMP;

    const userData = {
      email,
      nome,
      tenantId,
      role: role || "USER",
      secretariaId: secretariaId || null,
      ativo: true,
      atualizadoEm: serverTime
    };
    if (isNewUser) userData.criadoEm = serverTime;

    // 🛡️ ATUALIZAÇÃO ATÔMICA DE DADOS E ÍNDICES
    const updates = {};
    updates[`users/${uid}`] = userData;
    updates[`indices/usersByTenant/${tenantId}/${uid}`] = true;
    
    // 🔥 ÍNDICE OBRIGATÓRIO DE SECRETARIA
    if (secretariaId) {
        updates[`indices/usersBySecretaria/${secretariaId}/${uid}`] = true;
    }

    await db.ref().update(updates);

    await admin.auth().setCustomUserClaims(uid, {
        tenantId: tenantId,
        role: userData.role,
        secretariaId: userData.secretariaId
    });

    return res.status(200).json({ success: true, uid: uid });

  } catch (error) {
    console.error("Erro no processamento do usuário:", error);
    return res.status(500).json({ error: error.message });
  }
}
