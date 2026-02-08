
import * as admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp();
}

// Backend de Backup e Segurança
export { dailyBackup } from "./backup/dailyBackup";
export { manualBackup } from "./backup/manualBackup";
export { restoreBackup } from "./backup/restoreValidated";
export { retentionPolicy } from "./backup/retentionPolicy";

// Disaster Recovery
export { runDisasterSimulation } from "./dr/runSimulation";

// Funções de Negócio Existentes
export { createTrip } from "./createTrip";
export { onTenantCreate, grantAnnualLicense, checkLicensesDaily, createTenant } from "./licensing";
export { cronExpireLicenses } from "./cronExpireLicenses";
export { notifyLicenseExpiration } from "./notifyLicenseExpiration";

// ✅ NOVOS INDEXADORES (ARQUITETURA DE PRODUÇÃO)
export { indexTenants } from "./tenants.index";
export { indexUsersByTenant } from "./users.index";
