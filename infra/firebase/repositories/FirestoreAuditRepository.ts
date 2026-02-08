
import { firestore } from '../firebaseAdmin'
import { AuditRepository } from '../../../codigo-fonte/repositories/AuditRepository'
import { AuditLog } from '../../../codigo-fonte/domain/AuditLog'

export class FirestoreAuditRepository implements AuditRepository {
  private collection = firestore.collection('audit_logs')

  async save(log: AuditLog): Promise<void> {
    await this.collection.add({
      municipalityId: log.municipalityId,
      userId: log.userId,
      action: log.action,
      entity: log.entity,
      timestamp: log.timestamp,
    })
  }
}
