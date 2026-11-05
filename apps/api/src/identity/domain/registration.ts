import { passwordIssue } from '@education/contracts';
import { emailIssue } from './email.js';
export function registrationIssue(email: string, password: string): string | undefined {
  return emailIssue(email) ?? passwordIssue(password);
}
