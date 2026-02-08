
import { License } from '../domain/License'
import { LicenseRepository } from '../repositories/LicenseRepository'

export class ActivateTrialLicense {
  constructor(private licenseRepo: LicenseRepository) {}

  async execute(municipalityId: string): Promise<void> {
    const now = new Date()
    const expires = new Date()
    expires.setDate(now.getDate() + 30)

    const license = new License(
      crypto.randomUUID(),
      municipalityId,
      'trial',
      'active',
      now,
      expires
    )

    await this.licenseRepo.save(license)
  }
}
