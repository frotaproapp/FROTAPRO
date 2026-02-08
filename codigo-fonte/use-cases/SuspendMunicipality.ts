
import { MunicipalityRepository } from '../repositories/MunicipalityRepository'

export class SuspendMunicipality {
  constructor(private municipalityRepo: MunicipalityRepository) {}

  async execute(municipalityId: string): Promise<void> {
    await this.municipalityRepo.updateStatus(municipalityId, 'blocked')
  }
}
