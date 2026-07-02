# PowerSync backend contract

Production rollout is blocked until the backend implements and verifies this contract.

## Upload endpoint

`POST /api/powersync/upload` accepts one PowerSync CRUD transaction. The backend must apply the entire `operations` array in one database transaction and return HTTP 200 with exactly one outcome:

```ts
type UploadResponse =
  | { outcome: 'accepted' }
  | { outcome: 'retryable_error'; error: string }
  | { outcome: 'permanent_error'; error: string };
```

- `accepted`: every operation was durably committed. Repeated transaction delivery must be idempotent.
- `retryable_error`: no operation was committed; retrying may succeed.
- `permanent_error`: no operation was committed. The client pauses automatic retries for the transaction, retains it locally, and reports it as blocked until it is explicitly resolved.
- Do not use HTTP 4xx for row validation failures because PowerSync treats 4xx upload failures as queue-blocking. Reserve 401/403 for an invalid session that must be refreshed or reauthenticated.

The backend derives `owner_user_id` from the authenticated JWT subject and ignores any client-provided ownership value. Authorization is checked for every chat, message, and supporter operation.

## PostgreSQL integrity

- `chats.owner_user_id` is non-null for server-owned rows and references the application user.
- `messages.chat_id` and `supporters.chat_id` reference `chats.id` with `ON DELETE CASCADE`.
- The replication publication includes `chats`, `messages`, and `supporters`, including cascaded deletes.
- A child write without an accessible parent is rejected atomically.

## Required backend integration scenarios

1. Atomic multi-operation acceptance and rollback on any failure.
2. Idempotent replay of an accepted transaction.
3. Rejection of cross-user reads and writes.
4. Assignment of authenticated ownership to previously unowned local chats.
5. Cascaded child deletion replicated through PowerSync.
6. Retry after transient database/network failure.
