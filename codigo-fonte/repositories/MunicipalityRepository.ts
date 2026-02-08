
import { Municipality } from '../domain/Municipality'

export interface MunicipalityRepository {
  findById(id: string): Promise<Municipality | null>
  updateStatus(id: string, status: 'active' | 'blocked'): Promise<void>
}
