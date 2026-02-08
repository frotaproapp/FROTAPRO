import * as admin from "firebase-admin";
import { HttpsError } from "firebase-functions/v2/https";

export async function requireSuperAdmin(context: any) {
  if (!context.auth) {
    throw new HttpsError("unauthenticated", "Autenticação obrigatória");
  }

  const user = await admin.auth().getUser(context.auth.uid);

  // Verifica claim personalizada.
  if (!user.customClaims?.superAdmin && !user.customClaims?.super_admin) {
    throw new HttpsError("permission-denied", "Acesso restrito ao Super Admin");
  }

  return user;
}