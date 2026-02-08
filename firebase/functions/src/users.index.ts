
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

export const indexUsersByTenant = functions.database
  .ref("/users/{uid}")
  .onWrite(async (change, context) => {
    const uid = context.params.uid;

    // Caso de remoção de usuário
    if (!change.after.exists()) {
      const oldTenant = change.before.child("tenantId").val();
      if (oldTenant) {
        await admin.database()
          .ref(`indices/usersByTenant/${oldTenant}/${uid}`)
          .remove();
      }
      return;
    }

    const newTenant = change.after.child("tenantId").val();
    const oldTenant = change.before.child("tenantId").val();

    // Remove do tenant antigo se houve mudança de prefeitura
    if (oldTenant && oldTenant !== newTenant) {
      await admin.database()
        .ref(`indices/usersByTenant/${oldTenant}/${uid}`)
        .remove();
    }

    // Cria ou atualiza o índice no novo tenant
    if (newTenant) {
      await admin.database()
        .ref(`indices/usersByTenant/${newTenant}/${uid}`)
        .set(true);
    }

    console.log(`✔ Usuário ${uid} indexado no tenant ${newTenant}`);
  });
