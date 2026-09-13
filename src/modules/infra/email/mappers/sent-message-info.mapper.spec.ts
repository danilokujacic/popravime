import { MapSentMessageInfo } from './sent-message-info.mapper';

describe('MapSentMessageInfo', () => {
  it('maps accepted/rejected recipients and the message id', () => {
    const result = MapSentMessageInfo({
      accepted: ['ana@popravime.me', { address: 'marko@popravime.me' }],
      rejected: [{ address: 'bad@popravime.me' }],
      messageId: '<abc123@smtp>',
    } as unknown as Parameters<typeof MapSentMessageInfo>[0]);

    expect(result).toEqual({
      accepted: ['ana@popravime.me', 'marko@popravime.me'],
      rejected: ['bad@popravime.me'],
      messageId: '<abc123@smtp>',
    });
  });

  it('falls back to null when the provider does not return a message id', () => {
    const result = MapSentMessageInfo({
      accepted: [],
      rejected: [],
      messageId: undefined,
    } as unknown as Parameters<typeof MapSentMessageInfo>[0]);

    expect(result.messageId).toBeNull();
  });
});
