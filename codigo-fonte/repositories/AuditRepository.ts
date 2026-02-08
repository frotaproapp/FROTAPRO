
import { AuditLog } from '../domain/AuditLog'

export interface AuditRepository {
  save(log: AuditLog): Promise<void>
}
