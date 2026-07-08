import { Message } from './Message';
import { MessageSource } from './MessageSource';

export class MessageLoader {
  private readonly sources: MessageSource[] = [];
  private activeSourceIndex = 0;
  private loading?: Promise<Message[]>;

  addSource(source: MessageSource): void {
    this.sources.push(source);
  }

  loadNextChunk(): Promise<Message[]> {
    if (this.loading) return this.loading;

    this.loading = this.trackLoad();
    return this.loading;
  }

  private async loadFromActiveSource(): Promise<Message[]> {
    while (this.activeSourceIndex < this.sources.length) {
      const source = this.sources[this.activeSourceIndex];
      const messages = await source.loadChunk();
      if (source.isExhausted()) this.activeSourceIndex++;
      if (messages.length > 0) return messages;
    }
    return [];
  }

  private async trackLoad(): Promise<Message[]> {
    try {
      return await this.loadFromActiveSource();
    } finally {
      this.loading = undefined;
    }
  }
}
