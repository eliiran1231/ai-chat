const { app } = require('electron');
const { mkdtemp, rm, writeFile } = require('node:fs/promises');
const { tmpdir } = require('node:os');
const path = require('node:path');

async function run() {
  await app.whenReady();

  const resultPath = process.argv.at(-1);
  const reportProgress = (stage) => writeFile(resultPath, JSON.stringify({ stage }), 'utf8');
  await reportProgress('app-ready');

  const [powerSync, drizzleDriver, drizzle, powerSyncSchema, schema, chatModule, messageModule, supporterModule] =
    await Promise.all([
      import('@powersync/node'),
      import('@powersync/drizzle-driver'),
      import('drizzle-orm'),
      import('../../services/powersync-schema.js'),
      import('../../services/drizzle-schema.js'),
      import('../../services/chat.service.js'),
      import('../../services/message.service.js'),
      import('../../services/supporter.service.js'),
    ]);

  const { PowerSyncDatabase } = powerSync;
  const { wrapPowerSyncWithDrizzle } = drizzleDriver;
  const { eq } = drizzle;
  const { AppSchema } = powerSyncSchema;
  const { chats, drizzleSchema, messages, supporters } = schema;
  const { ChatService } = chatModule;
  const { MessageService } = messageModule;
  const { SupporterService } = supporterModule;

  const testDirectory = await mkdtemp(path.join(tmpdir(), 'ai-chat-drizzle-'));
  const database = new PowerSyncDatabase({
    schema: AppSchema,
    database: { dbFilename: path.join(testDirectory, 'test.sqlite') },
  });
  const orm = wrapPowerSyncWithDrizzle(database, { schema: drizzleSchema });
  const serviceDatabase = {
    orm,
    parseJsonColumn(value) {
      return value ? JSON.parse(value) : undefined;
    },
  };
  const chatService = new ChatService(serviceDatabase);
  const messageService = new MessageService(serviceDatabase);
  const supporterService = new SupporterService(serviceDatabase);

  try {
    await reportProgress('creating-chat');
    const chat = await chatService.createChat({
      name: 'Drizzle chat',
      status: 'active',
      avatar: { type: 'text', value: 'DC' },
    });
    await reportProgress('creating-message');
    const message = await messageService.createMessage({
      id: 'message-returning',
      chatId: chat.id,
      from: 'client',
      value: 'Persisted through PowerSync',
      time: '2026-01-01T00:00:00.000Z',
    });
    await reportProgress('checking-returning');
    const persistedChats = await orm.select().from(chats).where(eq(chats.id, chat.id));
    const persistedMessages = await orm
      .select()
      .from(messages)
      .where(eq(messages.id, message.id));

    const cascadeChat = await chatService.createChat({
      name: 'Cascade chat',
      status: 'active',
      avatar: { type: 'text', value: 'CC' },
    });
    await reportProgress('creating-cascade-children');
    await messageService.createMessage({
      id: 'cascade-message',
      chatId: cascadeChat.id,
      value: 'Delete me',
      time: '2026-01-01T00:00:00.000Z',
    });
    await supporterService.createSupporter({
      id: 'cascade-supporter',
      chatId: cascadeChat.id,
      agentName: 'Agent',
    });
    await reportProgress('deleting-cascade');
    await chatService.deleteChat(cascadeChat.id);

    await reportProgress('checking-cascade');
    const cascadeRows = {
      chats: (await orm.select().from(chats).where(eq(chats.id, cascadeChat.id))).length,
      messages: (await orm.select().from(messages).where(eq(messages.chatId, cascadeChat.id)))
        .length,
      supporters: (await orm.select().from(supporters).where(eq(supporters.chatId, cascadeChat.id)))
        .length,
    };

    for (const id of ['message-a', 'message-b', 'message-c']) {
      await messageService.createMessage({
        id,
        chatId: 'pagination-chat',
        value: id,
        time: '2026-01-01T00:00:00.000Z',
      });
    }
    await reportProgress('checking-pagination');
    const firstPage = await messageService.getChatMessages('pagination-chat', 0, 2);
    const secondPage = await messageService.getChatMessages('pagination-chat', 2, 2);

    await writeFile(
      resultPath,
      JSON.stringify({
        returning: {
          chatName: chat.name,
          messageId: message.id,
          chatRows: persistedChats.length,
          messageRows: persistedMessages.length,
        },
        cascadeRows,
        pages: [
          firstPage.map(({ id }) => id),
          secondPage.map(({ id }) => id),
        ],
      }),
      'utf8',
    );
  } finally {
    await database.close();
    await rm(testDirectory, { recursive: true, force: true });
  }
}

run()
  .then(() => app.exit(0))
  .catch(async (error) => {
    const resultPath = process.argv.at(-1);
    await writeFile(resultPath, JSON.stringify({ error: String(error) }), 'utf8').catch(() => {});
    app.exit(1);
  });
