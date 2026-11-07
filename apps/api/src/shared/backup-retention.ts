// How long a backup of the application database may be restored. Every stored
// copy expires by then, and a restore refuses an older one.
export const backupRetentionDays = 14;

// A finished deletion stays in the ledger a day longer than any backup that can
// still hold the family, so every restorable backup can be cleared of it. The
// day also covers the provider's own restore window, which is shorter.
export const ledgerRetentionDays = backupRetentionDays + 1;
