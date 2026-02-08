
import { AuditRepository } from '../repositories/AuditRepository'
import { AuditLog } from '../domain/AuditLog'

export class AuditService {
  constructor(private auditRepo: AuditRepository) {}

  async log(
    municipalityId: string,
    userId: string,
    action: string,
    entity: string
  ) {
    const log = new AuditLog(municipalityId, userId, action, entity)
    await this.auditRepo.save(log)
  }
}
