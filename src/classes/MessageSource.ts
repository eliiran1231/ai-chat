import { Chat } from './Chat';
import { Message } from './Message';

export abstract class MessageSource {
  private start = 0;
  private chunkSize = 20;
  private exhausted = false;

  constructor(protected readonly chat: Chat) {}

  protected abstract getMessages(start: number, end: number): Message[] | Promise<Message[]>;

  async loadChunk(): Promise<Message[]> {
    if (this.exhausted) return [];

    const messages = await this.getMessages(this.start, this.start + this.chunkSize);
    this.exhausted = messages.length < this.chunkSize;
    this.start += messages.length;
    this.chat.messages.update(current => [...messages, ...current]);
    return messages;
  }

  isExhausted(): boolean {
    return this.exhausted;
  }

  setChunkSize(size: number): void {
    if (size <= 0) throw new Error('Message source chunk size must be positive.');
    this.chunkSize = size;
  }
}
