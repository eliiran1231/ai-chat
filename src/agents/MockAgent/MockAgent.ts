import { Injector } from "@angular/core";
import { Agent } from "../../classes/Agent";
import { Chat } from "../../classes/Chat";
import { Question } from "../../classes/Question";
import { Supporter } from "../../classes/Supporter";

export class MockAgent extends Agent {
  private readonly nextQuestionByTag: Record<string, () => Question> = {
    greeting: () =>
      new Question('what is your name?', {
        validator: /^[a-zA-Z]+$/,
        validationErrorMessage: 'name should only contain letters',
        tag: 'name',
      }),
    name: () =>
      new Question('whats your age?', {
        validator: /^(120|1[0-1][0-9]|[1-9]?[0-9])$/,
        validationErrorMessage: 'this isnt a real age',
        tag: 'age',
      }),
    age: () =>
      new Question('what email should we use to contact you?', {
        validator: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        validationErrorMessage: 'please enter a valid email address',
        tag: 'email',
      }),
    email: () =>
      new Question('what do you need help with?', {
        validator: {
          type: 'oneOf',
          values: ['billing', 'technical issue', 'account', 'other'],
        },
        validationErrorMessage: 'please choose one of the available topics',
        possibleAnswers: ['billing', 'technical issue', 'account', 'other'],
        tag: 'topic',
      }),
    topic: () =>
      new Question('how urgent is this?', {
        validator: {
          type: 'oneOf',
          values: ['low','normal','urgent'],
        },
        validationErrorMessage: 'please choose low, normal, or urgent',
        possibleAnswers: ['low','normal','urgent'],
        tag: 'urgency',
      }),
    urgency: () =>
      new Question('how would you prefer we follow up?', {
        validator: {
          type: 'oneOf',
          values: ['chat', 'email', 'phone'],
        },
        possibleAnswers: ['chat', 'email', 'phone'],
        answerSelectionMode: 'multiple',
        validationErrorMessage: 'please choose chat, email, or phone',

        tag: 'contactPreference',
      }),
  };

  constructor(injector: Injector) {
    super(injector);
  }

  override init(chat: Chat, supporter: Supporter) {
    super.init(chat, supporter);
    if (!this.chat.messages.find((msg) => msg.tag == 'greeting')) {
      const possibleAnswers = ['hi', 'hello', 'hey'];
      const question = new Question('hello there how can I help you?', {
        validator: {
          type: 'oneOf',
          values: possibleAnswers,
        },
        validationErrorMessage: 'i do not understand you',
        possibleAnswers,
        tag: 'greeting',
      });
      this.supporter.ask(question);
      return;
    }
  }

  override async respond(): Promise<void> {
    super.respond();
    if (!this.lastQuestion) return;
    if (this.lastMessage instanceof Question) {
      this.supporter.sendMessage('a supporter will get back to you on that');
      return;
    }

    if (this.lastQuestion.tag == 'contactPreference') {
      this.supporter.sendMessage(
        'thanks, your request has been submitted and a supporter will review it soon',
      );
      return;
    }

    const createNextQuestion = this.nextQuestionByTag[this.lastQuestion.tag];
    if (createNextQuestion) this.supporter.ask(createNextQuestion());
  }
}
