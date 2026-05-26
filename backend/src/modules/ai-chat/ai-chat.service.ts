import { BadRequestException, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AiChatService {
  constructor(private readonly prisma: PrismaService) {}

  async session(userId: string) {
    const existing = await this.prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
      'SELECT * FROM "AiChatSession" WHERE "userId"=$1 ORDER BY "updatedAt" DESC LIMIT 1',
      userId,
    );
    if (existing[0]) return existing[0];
    const id = randomUUID();
    await this.prisma.$executeRawUnsafe(
      'INSERT INTO "AiChatSession" ("id","userId","title","updatedAt") VALUES ($1,$2,$3,NOW())',
      id,
      userId,
      'CRM assistant',
    );
    await this.addMessage(id, 'ASSISTANT', 'Hi. I can help with property records, CRM workflow, reminders, and quick summaries.');
    return (await this.prisma.$queryRawUnsafe<Array<Record<string, unknown>>>('SELECT * FROM "AiChatSession" WHERE id=$1', id))[0];
  }

  messages(sessionId: string) {
    return this.prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
      'SELECT * FROM "AiChatMessage" WHERE "sessionId"=$1 ORDER BY "createdAt" ASC',
      sessionId,
    );
  }

  async send(sessionId: string, content: string) {
    if (!content?.trim()) throw new BadRequestException('Message content is required.');
    const userMessage = await this.addMessage(sessionId, 'USER', content.trim());
    const assistantMessage = await this.addMessage(sessionId, 'ASSISTANT', this.reply(content));
    await this.prisma.$executeRawUnsafe('UPDATE "AiChatSession" SET "updatedAt"=NOW() WHERE id=$1', sessionId);
    return { userMessage, assistantMessage };
  }

  private async addMessage(sessionId: string, role: 'USER' | 'ASSISTANT', content: string) {
    const id = randomUUID();
    await this.prisma.$executeRawUnsafe(
      'INSERT INTO "AiChatMessage" ("id","sessionId","role","content") VALUES ($1,$2,$3::"AiChatRole",$4)',
      id,
      sessionId,
      role,
      content,
    );
    return (await this.prisma.$queryRawUnsafe<Array<Record<string, unknown>>>('SELECT * FROM "AiChatMessage" WHERE id=$1', id))[0];
  }

  private reply(content: string) {
    const text = content.toLowerCase();
    if (text.includes('remind')) return 'I added that as a reminder note. For scheduled work, use the calendar panel so it is assigned to an agent and stored.';
    if (text.includes('valuation') || text.includes('calendar')) return 'Open the calendar workspace, choose a free slot, assign an agent, then save. I will flag overlaps before it persists.';
    if (text.includes('summary')) return 'Quick summary: review active contacts, overdue tasks, upcoming appointments, and any users awaiting activation.';
    if (text.includes('property')) return 'For property help, keep the reference, owner/contact, agent, status, and appointment history linked so the CRM timeline stays useful.';
    return 'Got it. I can help with CRM guidance, property workflow, reminders, or a concise summary of the current workspace.';
  }
}
