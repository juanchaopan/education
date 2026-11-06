import { aiHelpFallbackReasons } from '@education/contracts';
import { expect, it } from 'vitest';
import { fallbackMessage } from './ai-help-message';

it('tells the child in plain Chinese that the work is kept, without provider details', () => {
  for (const reason of aiHelpFallbackReasons) {
    const message = fallbackMessage(reason);
    expect(message).toMatch(/[一-鿿]/);
    expect(message).not.toMatch(/OpenAI|API|key|token|预算|\$/i);
    if (reason !== 'invalid-input') expect(message).toContain('作答');
  }
});
