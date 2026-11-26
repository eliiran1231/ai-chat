const assert = require('node:assert/strict');
const { app } = require('electron');
const { access, mkdtemp, readFile, rm, writeFile } = require('node:fs/promises');
const { tmpdir } = require('node:os');
const path = require('node:path');

async function run() {
  await app.whenReady();

  const resultPath = process.argv.at(-1);
  const reportProgress = (stage) => writeFile(resultPath, JSON.stringify({ stage }), 'utf8');
  await reportProgress('app-ready');

  const testDirectory = await mkdtemp(path.join(tmpdir(), 'ai-chat-drizzle-'));
  app.setPath('userData', testDirectory);

  const [powerSync, drizzleDriver, drizzle, powerSyncSchema, schema, chatModule, messageModule, supporterModule, attachmentModule] =
    await Promise.all([
      import('@powersync/node'),
      import('@powersync/drizzle-driver'),
      import('drizzle-orm'),
      import('../../services/powersync-schema.js'),
      import('../../services/drizzle-schema.js'),
      import('../../services/chat.service.js'),
      import('../../services/message.service.js'),
      import('../../services/supporter.service.js'),
      import('../../services/attachment.service.js'),
    ]);

  const { PowerSyncDatabase } = powerSync;
  const { wrapPowerSyncWithDrizzle } = drizzleDriver;
  const { eq } = drizzle;
  const { AppSchema } = powerSyncSchema;
  const { chats, drizzleSchema, messages, supporters } = schema;
  const { ChatService } = chatModule;
  const { MessageService } = messageModule;
  const { SupporterService } = supporterModule;
  const { attachmentService } = attachmentModule;

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
      from: { type: 'client' },
      value: 'Persisted through PowerSync',
      time: '2026-01-01T00:00:00.000Z',
    });
    await reportProgress('checking-returning');
    const persistedChats = await orm.select().from(chats).where(eq(chats.id, chat.id));
    const persistedMessages = await orm
      .select()
      .from(messages)
      .where(eq(messages.id, message.id));

    assert.deepEqual(message.from, { type: 'client' });
    assert.deepEqual(JSON.parse(persistedMessages[0].sender), { type: 'client' });
    await messageService.commitMessage({ ...message, from: { type: 'supporter', agentName: 'registered-agent' } });
    let [reloaded] = await messageService.getChatMessages(chat.id, 0, 20);
    assert.deepEqual(reloaded.from, { type: 'supporter', agentName: 'registered-agent' });
    await messageService.commitMessage({ ...reloaded, from: { type: 'client' } });
    [reloaded] = await messageService.getChatMessages(chat.id, 0, 20);
    assert.deepEqual(reloaded.from, { type: 'client' });
    await orm.update(messages).set({ sender: 'supporter' }).where(eq(messages.id, message.id));
    [reloaded] = await messageService.getChatMessages(chat.id, 0, 20);
    assert.deepEqual(reloaded.from, { type: 'supporter' });

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

    for (const id of ['batch-edit-a', 'batch-edit-b']) {
      await messageService.createMessage({
        id,
        chatId: 'batch-chat',
        value: id,
        time: '2026-01-01T00:00:00.000Z',
      });
    }
    await reportProgress('editing-batch');
    const editedIds = await messageService.editBatch(
      ['batch-edit-a', 'batch-edit-b'].map((id) => ({
        id,
        value: `${id}-updated`,
        time: '2026-01-01T00:00:00.000Z',
        editedAt: '2026-01-02T00:00:00.000Z',
        status: 1,
        editable: true,
        deletable: true,
      })),
    );
    const editedRows = await orm
      .select()
      .from(messages)
      .where(eq(messages.chatId, 'batch-chat'))
      .orderBy(messages.id);
    await reportProgress('deleting-batch');
    const deletedIds = await messageService.deleteBatch(['batch-edit-a', 'batch-edit-b']);
    const remainingBatchRows = await orm
      .select()
      .from(messages)
      .where(eq(messages.chatId, 'batch-chat'));

    for (const [id, deletable] of [['batch-deleteable', true], ['batch-locked', false]]) {
      await messageService.createMessage({
        id,
        chatId: 'batch-protected-chat',
        value: id,
        time: '2026-01-01T00:00:00.000Z',
        deletable,
      });
    }
    const protectedDeleteIds = await messageService.deleteBatch([
      'batch-deleteable',
      'batch-locked',
    ]);
    const protectedRemainingRows = await orm
      .select({ id: messages.id })
      .from(messages)
      .where(eq(messages.chatId, 'batch-protected-chat'));

    await reportProgress('deleting-attachments');
    const attachmentChatId = 'attachment-chat';
    const attachments = new Map();
    for (const id of ['attachment-deletable', 'attachment-locked', 'attachment-unselected']) {
      const url = await attachmentService.saveAttachment(
        attachmentChatId, 'file.txt', Buffer.from(id),
      );
      const attachment = { url, name: 'file', extension: 'txt', type: 'text/plain', size: id.length };
      attachments.set(id, attachment);
      await messageService.createMessage({
        id, chatId: attachmentChatId, value: id, time: '2026-01-01T00:00:00.000Z',
        attachment, deletable: id !== 'attachment-locked',
      });
    }
    await messageService.createMessage({
      id: 'attachment-text', chatId: attachmentChatId, value: 'No attachment',
      time: '2026-01-01T00:00:00.000Z',
    });
    assert.deepEqual(await messageService.deleteBatch([]), []);
    assert.deepEqual(await messageService.deleteBatch(['missing-message']), []);
    assert.deepEqual((await messageService.deleteBatch([
      'attachment-deletable', 'attachment-deletable', 'attachment-locked',
      'attachment-text', 'missing-message',
    ])).sort(), ['attachment-deletable', 'attachment-text']);
    await assert.rejects(access(attachments.get('attachment-deletable').url), { code: 'ENOENT' });
    for (const id of ['attachment-locked', 'attachment-unselected']) {
      assert.equal(await readFile(path.join(attachments.get(id).url, 'file.txt'), 'utf8'), id);
    }
    assert.deepEqual(
      (await messageService.getChatMessages(attachmentChatId, 0, 20)).map(({ id }) => id).sort(),
      ['attachment-locked', 'attachment-unselected'],
    );

    assert.equal(await messageService.deleteMessage('attachment-unselected'), true);
    await assert.rejects(access(attachments.get('attachment-unselected').url), { code: 'ENOENT' });
    assert.equal(await messageService.deleteMessage('attachment-unselected'), false);
    assert.equal(await messageService.deleteMessage('attachment-locked'), false);
    assert.equal(
      await readFile(path.join(attachments.get('attachment-locked').url, 'file.txt'), 'utf8'),
      'attachment-locked',
    );

    // Missing local files should not prevent deleting a synced message.
    await messageService.createMessage({
      id: 'attachment-missing', chatId: attachmentChatId, value: 'Missing local attachment',
      time: '2026-01-01T00:00:00.000Z', attachment: attachments.get('attachment-deletable'),
    });
    assert.deepEqual(await messageService.deleteBatch(['attachment-missing']), ['attachment-missing']);

    // Reject a path targeting the chat directory and keep the message when cleanup fails.
    await messageService.createMessage({
      id: 'attachment-invalid', chatId: attachmentChatId, value: 'Invalid attachment path',
      time: '2026-01-01T00:00:00.000Z',
      attachment: { ...attachments.get('attachment-locked'), url: '.' },
    });
    await assert.rejects(messageService.deleteBatch(['attachment-invalid']), /Invalid attachment path/);
    assert.equal((await orm.select().from(messages).where(eq(messages.id, 'attachment-invalid'))).length, 1);
    assert.equal(
      await readFile(path.join(attachments.get('attachment-locked').url, 'file.txt'), 'utf8'),
      'attachment-locked',
    );

    for (const [id, editable] of [['batch-rollback-a', true], ['batch-rollback-b', false]]) {
      await messageService.createMessage({
        id,
        chatId: 'batch-rollback-chat',
        value: id,
        time: '2026-01-01T00:00:00.000Z',
        editable,
      });
    }
    await assert.rejects(() => messageService.editBatch([
      {
        id: 'batch-rollback-a', value: 'should-not-persist', time: '2026-01-01T00:00:00.000Z',
        status: 1, editable: true, deletable: true,
      },
      {
        id: 'batch-rollback-b', value: 'locked-change', time: '2026-01-01T00:00:00.000Z',
        status: 1, editable: true, deletable: true,
      },
    ]));
    const rollbackRows = await orm
      .select({ value: messages.value })
      .from(messages)
      .where(eq(messages.chatId, 'batch-rollback-chat'))
      .orderBy(messages.id);

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
        batch: {
          editedIds,
          values: editedRows.map(({ value }) => value),
          deletedIds: deletedIds.sort(),
          remainingRows: remainingBatchRows.length,
          protectedDeleteIds: protectedDeleteIds.sort(),
          protectedRemainingIds: protectedRemainingRows.map(({ id }) => id).sort(),
          rollbackValues: rollbackRows.map(({ value }) => value),
        },
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
