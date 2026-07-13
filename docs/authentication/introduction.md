# Authentication and synchronization

Every `ChatProvider` exposes an `AuthenticationProvider`. This keeps session behavior provider-scoped: connecting or disconnecting one backend affects only the chats owned by that backend.

# Authentication provider interface

An implementation exposes four read-only signals:

| Signal | Meaning |
| --- | --- |
| `currentUser` | Authenticated `AuthUser`, or `null`. |
| `loggedIn` | Derived boolean indicating whether a user exists. |
| `state` | Detailed authentication lifecycle state. |
| `syncState` | Connection and synchronization lifecycle state. |

It also implements:

```ts
register(details: RegistrationDetails): Promise<AuthUser>;
login(credentials: AuthCredentials): Promise<AuthUser>;
logout(): Promise<void>;
getCurrentUser(): Promise<AuthUser | null>;
```

Credentials currently contain `email` and `password`; registration may also include `displayName`.

# Authentication states

`AuthState` is a discriminated union:

| `kind` | User | Meaning |
| --- | --- | --- |
| `checking` | `null` | Session restoration is in progress. |
| `authenticated` | `AuthUser` | A valid session is available. |
| `unauthenticated` | `null` | Session checking completed without a user. |
| `error` | `null` | Session initialization failed; includes an error message. |

Do not treat `checking` as unauthenticated. Wait for initialization to finish before showing a definitive login state.

# Synchronization states

`SyncState.kind` can be:

- `local-only`;
- `connecting`;
- `syncing`;
- `online`;
- `offline`;
- `authentication-required`;
- `blocked`;
- `error`.

The state also reports `connected`, an optional `lastSyncedAt`, an optional error, and optional blocked-upload details.

Authentication and synchronization are related but not identical. A user can have a persisted session while the device is offline, and local database operations can continue while synchronization is unavailable.

# Logout policy

Every authentication provider declares:

```ts
readonly options: AuthenticationProviderOptions = {
  logoutPolicy: {
    clearLocalData: false,
  },
};
```

`clearLocalData: false` disconnects without erasing the local database. Set it to `true` only when the product's security and offline-data requirements explicitly require local deletion.

# Creating an authentication provider

```ts
@Injectable()
export class MyAuthenticationProvider implements AuthenticationProvider {
  readonly options = defaultAuthenticationProviderOptions;

  private readonly _state = signal<AuthState>({ kind: 'checking', user: null });
  readonly state = this._state.asReadonly();
  readonly currentUser = computed(() => this.state().user);
  readonly loggedIn = computed(() => this.currentUser() !== null);

  private readonly _syncState = signal<SyncState>({
    kind: 'local-only',
    connected: false,
  });
  readonly syncState = this._syncState.asReadonly();

  async getCurrentUser(): Promise<AuthUser | null> {
    this._state.set({ kind: 'checking', user: null });
    try {
      const user = await this.session.restore();
      this._state.set(
        user
          ? { kind: 'authenticated', user }
          : { kind: 'unauthenticated', user: null },
      );
      return user;
    } catch (error) {
      this._state.set({
        kind: 'error',
        user: null,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  // Implement register, login, and logout with the same explicit state updates.
}
```

The example omits backend-specific services and the remaining interface methods.

# Authentication component

Provider metadata identifies the Angular component used by the connection dialog:

```ts
readonly metadata = {
  id: 'my-provider',
  displayName: 'My Provider',
  description: 'Connect to My Provider.',
  avatarUrl: '/assets/my-provider.svg',
  authenticationComponent: MyProviderConnectComponent,
};
```

That component injects `PROVIDER_AUTHENTICATION_DIALOG_CONTEXT`. The context contains the selected provider and a `close(user?)` function:

```ts
readonly context = inject(PROVIDER_AUTHENTICATION_DIALOG_CONTEXT);

async connect(): Promise<void> {
  const user = await this.context.provider.authentication.login({
    email: this.email(),
    password: this.password(),
  });
  this.context.close(user);
}
```

Return the authenticated user when connection succeeds. Closing without a user cancels the flow.

# Provider-scoped lifecycle

The provider UI follows this lifecycle:

1. Call `getCurrentUser()` when rendering registered providers.
2. Open the provider's authentication component when disconnected.
3. After connection, call `ChatService.loadProviderChats(provider)`.
4. On logout, call `provider.authentication.logout()`.
5. Remove only that provider's chats with `ChatService.clearChats(provider.metadata.id)`.

Provider metadata IDs and the manager-provider association are what make scoped cleanup possible.

# PowerSync implementation

`PowerSyncAuthenticationService` sends authentication requests through Electron IPC and listens for main-process sync-state events. It starts with `checking` and `local-only`, updates authentication state after every session operation, and surfaces initialization errors rather than silently treating them as logout.

Backend upload outcomes, ownership, and retry requirements are documented in the [PowerSync backend contract](../powersync-backend-contract.md).
