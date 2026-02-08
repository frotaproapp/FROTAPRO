
export type LicenseType = 'trial' | 'annual'
export type LicenseStatus = 'active' | 'expired' | 'suspended'

export class License {
  constructor(
    public readonly id: string,
    public readonly municipalityId: string,
    public type: LicenseType,
    public status: LicenseStatus,
    public startsAt: Date,
    public expiresAt: Date,
    public processNumber?: string,
    public empenhoNumber?: string
  ) {}

  isActive(): boolean {
    const now = new Date()
    return (
      this.status === 'active' &&
      now >= this.startsAt &&
      now <= this.expiresAt
    )
  }
}
