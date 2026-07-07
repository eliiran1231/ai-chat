import { dbService, type DbService } from './db.service.js';
import { randomUUID } from 'crypto';
import { eq } from 'drizzle-orm';
import { supporters, type SupporterRow } from './drizzle-schema.js';

type Uuid = string;

export interface SupporterPayload {
  id?: Uuid;
  chatId: Uuid;
  agentName: string;
  name?: string | null;
  expects?: string | null;
  context?: string | null;
}

export interface UpdateSupporterAgentPayload {
  chatId: Uuid;
  agentName: string;
}

export interface CommitSupporterPayload {
  id: Uuid;
  name?: string | null;
  expects?: string | null;
  context?: string | null;
}

export class SupporterService {
  constructor(private readonly db: DbService) {}

  async getChatSupporter(chatId: Uuid) {
    const [row] = await this.db.orm
      .select()
      .from(supporters)
      .where(eq(supporters.chatId, chatId))
      .limit(1);

    return this.mapSupporterRow(row);
  }

  async createSupporter(supporter: SupporterPayload) {
    const now = new Date().toISOString();
    const supporterId = supporter.id || randomUUID();
    const [row] = await this.db.orm
      .insert(supporters)
      .values({
        id: supporterId,
        chatId: supporter.chatId,
        agentName: supporter.agentName,
        name: supporter.name ?? 'Supporter',
        expects: supporter.expects ?? 'question',
        context: supporter.context ?? '',
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    if (!row) {
      throw new Error(`Created supporter ${supporterId} could not be loaded.`);
    }

    return this.mapSupporterRow(row);
  }

  async updateSupporterAgent({
    chatId,
    agentName,
  }: UpdateSupporterAgentPayload): Promise<boolean> {
    const rows = await this.db.orm
      .update(supporters)
      .set({ agentName, updatedAt: new Date().toISOString() })
      .where(eq(supporters.chatId, chatId))
      .returning({ id: supporters.id });

    return rows.length > 0;
  }

  async commitSupporter({ id, name, expects, context }: CommitSupporterPayload): Promise<boolean> {
    const rows = await this.db.orm
      .update(supporters)
      .set({
        context: context ?? '',
        ...(name == null ? {} : { name }),
        ...(expects == null ? {} : { expects }),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(supporters.id, id))
      .returning({ id: supporters.id });

    return rows.length > 0;
  }

  private mapSupporterRow(row: SupporterRow | undefined) {
    if (!row) {
      return null;
    }

    return {
      id: row.id,
      chatId: row.chatId,
      agentName: row.agentName,
      name: row.name,
      expects: row.expects ?? 'question',
      context: row.context ?? '',
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}

export const supporterService = new SupporterService(dbService);
