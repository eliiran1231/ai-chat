/** Serializable sender identity. Agent names are keys in the registered agent map. */
export type MessageSenderRecord =
  | { type: 'client'; agentName?: never }
  | { type: 'supporter'; agentName?: string };
