import { createMachine, assign } from 'xstate';

export const mockFlowMachine = createMachine({
  /** @xstate-layout N4IgpgJg5mDOIC5QFsD2BjA1gMQDaoHcA6AQ1kwDkTkwBiAQQoGUB1AUQCUBtABgF1EoAA6pYASwAuY1ADtBIAB6IATADYA7EWUBWHjwDMPbWu0BGZfoA0IAJ6JTADk2rTGozwAsH4-rUBfP2s0LDxCUnJ6GAZmdm5+eRFxKVl5JQQ1TR09Q2NVMwtrOwQATlMtV1UnfQd9Yr1TUwCgjBx8YjJMSLpGVk4uUwEkEETJaTkhtLzlIgdVHW1i1WKPdQXiwvtTYqIeUsrTfXUnD1cPJpBg1rCxGQA3ElwxCC7aXkHhUVGUiZUNLV0DEYTOYrLZ7B4eEQ9pUeMoPA4PPp4aoAoEQDJUBA4PJLqECAlPslxqA0gBaVQbBDk864trhSjUMAEpJjVKII5EAF6VSHVbGdSUxyaUwndTKY7LEUOZQ0lp4+ldZlfYmKRDwyHS3RrDwuGqLQWOIguVQaPbFVaqDwytG0653B5PRVDEZEtkIK2UhxlQx6HhevI8LZGWUhOkQWRM52E1k-BAOZacpzaQ7KdSqTwHA0OI0VdRmi1W1F+IA */
  types: {} as {
    context: {
      name?: string;
      age?: number;
    };
    events:
    | { type: 'ANSWER' | 'QUESTION' | 'MESSAGE'; value: string };
  },

  id: 'mockFlow',
  initial: 'askName',

  states: {
    askName: {
      entry: 'askName',
      on: {
        ANSWER: [
          {
            target: 'invalidName',
            guard: 'isInvalidAnswer'
          },
          {
            target: 'askAge',
            actions: assign({
              name: ({ event }) => event.value
            })
          }
        ]
      }
    },

    askAge: {
      entry: 'askAge',
      on: {
        ANSWER: [
          {
            target: 'invalidAge',
            guard: "isInvalidAnswer"
          },
          {
            target: 'done',
            actions: assign({
              age: ({ event }) => Number(event.value)
            })
          }
        ]
      }
    },

    invalidName: {
      entry: 'sendInvalidName',
      always: 'askName'
    },

    invalidAge: {
      entry: 'sendInvalidAge',
      always: 'askAge'
    },

    done: {
      entry: 'finish'
    }
  }
});