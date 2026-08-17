import { tokenAudience } from './token-audience';

describe('tokenAudience', () => {
  it('reads Cognito ID-token audiences', () => {
    expect(tokenAudience({ aud: 'client-id' })).toBe('client-id');
    expect(tokenAudience({ aud: ['client-id', 'fallback'] })).toBe('client-id');
  });

  it('rejects a missing audience', () => {
    expect(tokenAudience({})).toBeNull();
  });
});
