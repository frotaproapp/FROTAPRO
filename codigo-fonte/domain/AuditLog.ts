
export class AuditLog {
  constructor(
    public readonly municipalityId: string,
    public readonly userId: string,
    public readonly action: string,
    public readonly entity: string,
    public readonly timestamp: Date = new Date()
  ) {}
}
