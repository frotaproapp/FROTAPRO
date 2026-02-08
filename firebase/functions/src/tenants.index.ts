
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

export const indexTenants = functions.database
  .ref("/tenants/{tenantId}")
  .onCreate(async (snapshot, context) => {
    const tenantId = context.params.tenantId;

    await admin.database()
      .ref(`indices/tenantsAll/${tenantId}`)
      .set(true);

    console.log(`✔ Tenant indexado: ${tenantId}`);
  });
