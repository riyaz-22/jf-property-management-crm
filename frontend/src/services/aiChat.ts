import type { AiChatMessage, AiChatSession } from '../types/domain';
import { apiClient, unwrap } from './api';

export const aiChatService = {
  async session() {
    return unwrap<AiChatSession>(await apiClient.get('/ai-chat/session'));
  },
  async messages(sessionId: string) {
    return unwrap<AiChatMessage[]>(await apiClient.get(`/ai-chat/sessions/${sessionId}/messages`));
  },
  async send(sessionId: string, content: string) {
    return unwrap<{ userMessage: AiChatMessage; assistantMessage: AiChatMessage }>(
      await apiClient.post(`/ai-chat/sessions/${sessionId}/messages`, { content }),
    );
  },
};
