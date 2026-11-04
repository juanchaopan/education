// No provider is installed until the verification flow (#21) is available.
export const isolatedMail = {
  requestVerification: async (_email: string): Promise<'not-sent'> => 'not-sent',
};
export type RegistrationMail = typeof isolatedMail;
