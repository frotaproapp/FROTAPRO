
import admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n") : undefined
    }),
    databaseURL: process.env.FIREBASE_DATABASE_URL
  });
}

const db = admin.database();

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  try {
    const { municipio, email, cnpj, uf, endereco } = req.body;

    if (!municipio || !email || !cnpj) {
      return res.status(400).json({ error: "Município, Email e CNPJ são obrigatórios." });
    }

    let userRecord;
    try {
      userRecord = await admin.auth().getUserByEmail(email);
    } catch (err) {
      if (err.code === "auth/user-not-found") {
        userRecord = await admin.auth().createUser({
          email,
          password: "Admin@123",
          emailVerified: true
        });
      } else throw err;
    }

    const tenantId = db.ref("tenants").push().key;
    const nowTimestamp = admin.database.ServerValue.TIMESTAMP;
    const expiryTimestamp = Date.now() + 30 * 86400000; // Trial de 30 dias

    // 1. Criar tenant
    await db.ref(`tenants/${tenantId}`).set({
      name: municipio,
      cnpj: cnpj || "",
      estado: uf || "",
      address: endereco || "",
      active: true,
      adminUid: userRecord.uid,
      license: {
        type: "TRIAL",
        expiresAt: expiryTimestamp // ✅ Armazenado como número
      },
      criadoEm: nowTimestamp // ✅ Server Timestamp
    });

    // 2. Criar Perfil de Usuário
    const userData = {
      nome: municipio + " - Admin",
      email,
      role: "ADMIN_TENANT",
      tenantId,
      ativo: true,
      criadoEm: nowTimestamp
    };
    await db.ref(`users/${userRecord.uid}`).set(userData);
    
    await db.ref(`indices/usersByTenant/${tenantId}/${userRecord.uid}`).set(true);

    await admin.auth().setCustomUserClaims(userRecord.uid, {
      role: "ADMIN_TENANT",
      tenantId
    });

    return res.status(200).json({ success: true, tenantId, adminUid: userRecord.uid });

  } catch (error) {
    console.error("Erro ao criar tenant:", error);
    return res.status(500).json({ error: error.message });
  }
}
