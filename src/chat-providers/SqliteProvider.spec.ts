import { normalizePersistedAgentName } from './SqliteProvider';

describe('normalizePersistedAgentName', () => {
  it('migrates persisted AiAgent chats to DeepAgent', () => {
    expect(normalizePersistedAgentName('AiAgent')).toBe('DeepAgent');
    expect(normalizePersistedAgentName('MockAgent')).toBe('MockAgent');
  });
});
