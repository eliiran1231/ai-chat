# Attachments

Messages can carry one attachment alongside their text value. Attachment metadata is stored on the message and rendered above its Markdown content.

## Attachment shape

```ts
export type Attachment = {
  type: string;
  url: string;
  size: number;
  extension: string;
  name: string;
};
```

| Property | Meaning |
| --- | --- |
| `type` | Browser MIME type, used to distinguish image previews from file cards. |
| `url` | Processed URL used for previewing or downloading the file. |
| `size` | File size in bytes. |
| `extension` | Filename extension without the leading dot. |
| `name` | Filename without the extension. |

## Sending an attachment

Create metadata and include it in `MessageOptions`:

```ts
const attachment: Attachment = {
  type: file.type,
  url: await chat.processFileUrl(file),
  size: file.size,
  extension: 'pdf',
  name: 'invoice',
};

await chat.user.ask(
  new Question('Please review the attached invoice.', { attachment }),
);
```

`Message.setAttachment(...)` can update or remove attachment metadata on an existing model:

```ts
message.setAttachment(attachment);
message.setAttachment(undefined);
```

For user-driven changes, ensure the provider save handler persists the synced attachment field.

## File processing

The UI calls `chat.processFileUrl(file)`, which delegates to `ChatManager.handleFile(file)`.

The base manager uses `URL.createObjectURL(file)`. Object URLs are temporary and local to the current renderer session, so they are not appropriate for durable or cross-device attachments.

A persistent manager should override file handling:

```ts
override async handleFile(file: File): Promise<string> {
  return this.fileStorage.upload(file);
}
```

The returned URL becomes part of the persisted attachment metadata. The implementation is responsible for upload authorization, size limits, content validation, cleanup, and URL lifetime.

## Current UI flow

The built-in chat UI:

1. opens a native file picker;
2. shows `FilePreviewComponent`;
3. calls the chat's file processor;
4. builds attachment metadata from the selected file;
5. submits the optional caption as the message value;
6. sends the attachment through the normal client message flow.

Images are rendered with an `<img>` element when `type` starts with `image`. Other files render as a download card using the attachment URL.

## Provider responsibilities

Providers must serialize and hydrate all attachment fields. Hydrated messages must still be attached to their chat so delete and retry behavior can reach the correct manager.

Treat attachment URLs as untrusted provider data. Keep external links isolated with appropriate browser policies and do not render arbitrary file content as executable HTML.
