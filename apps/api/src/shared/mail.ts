// Parents authenticate before requesting verification; registration itself never sends mail.
export const isolatedMail = {
  requestVerification: async (_email: string): Promise<'not-sent'> => 'not-sent',
};
export type RegistrationMail = typeof isolatedMail;
