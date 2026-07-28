import {
  ipcMain,
  WebContentsView,
  type BrowserWindow,
  type IpcMainEvent,
} from 'electron';
import * as path from 'node:path';
import { pathToFileURL } from 'node:url';
import type {
  PermissionDecision,
  PermissionRequest,
} from '../../shared/permissions/permission.js';
import type { PermissionPresenter } from './permission.service.js';

const PERMISSION_DECISION_CHANNEL = 'system-permission:decision';

interface ActivePrompt {
  view: WebContentsView;
  resolve: (decision: PermissionDecision) => void;
  settled: boolean;
}

export class PermissionViewService implements PermissionPresenter {
  private active?: ActivePrompt;
  private readonly onDecision = (event: IpcMainEvent, decision: unknown) => {
    const active = this.active;
    if (!active || event.sender !== active.view.webContents) return;
    if (decision !== 'approve' && decision !== 'deny') return;
    this.settle(decision);
  };

  constructor(
    private readonly window: BrowserWindow,
    private readonly resourceRoot: string,
  ) {
    ipcMain.on(PERMISSION_DECISION_CHANNEL, this.onDecision);
    this.window.on('resize', () => this.resize());
    this.window.on('closed', () => this.dispose());
  }

  async present(request: PermissionRequest): Promise<PermissionDecision> {
    if (this.active) throw new Error('PERMISSION_PROMPT_ALREADY_ACTIVE');

    const view = new WebContentsView({
      webPreferences: {
        preload: path.join(this.resourceRoot, 'preload.cjs'),
        partition: `permission-${crypto.randomUUID()}`,
        contextIsolation: true,
        sandbox: true,
        nodeIntegration: false,
        webSecurity: true,
        allowRunningInsecureContent: false,
      },
    });
    view.setBackgroundColor('#00000000');
    this.harden(view);
    this.window.contentView.addChildView(view);
    this.resizeView(view);

    let resolvePrompt!: (decision: PermissionDecision) => void;
    const result = new Promise<PermissionDecision>((resolve) => {
      resolvePrompt = resolve;
    });
    this.active = { view, resolve: resolvePrompt, settled: false };

    view.webContents.once('destroyed', () => {
      if (this.active?.view === view) this.settle('deny', false);
    });
    try {
      await view.webContents.loadFile(path.join(this.resourceRoot, 'permission.html'), {
        query: {
          title: request.title,
          description: request.description,
          resource: request.resource,
        },
      });
    } catch (error) {
      this.settle('deny');
      throw error;
    }
    if (this.active?.view === view) {
      view.webContents.focus();
      // Start the animation only after the page is loaded and attached to the visible view.
      await view.webContents.executeJavaScript(
        'document.documentElement.classList.add("visible")',
        true,
      );
    }
    return result;
  }

  dismiss(): void {
    this.settle('deny');
  }

  dispose(): void {
    ipcMain.removeListener(PERMISSION_DECISION_CHANNEL, this.onDecision);
    this.settle('deny');
  }

  private harden(view: WebContentsView): void {
    const pageUrl = pathToFileURL(path.join(this.resourceRoot, 'permission.html')).href;
    const allowedPrefix = pathToFileURL(this.resourceRoot + path.sep).href;
    const contents = view.webContents;

    contents.setWindowOpenHandler(() => ({ action: 'deny' }));
    contents.on('will-navigate', (event, url) => {
      if (!url.startsWith(pageUrl)) event.preventDefault();
    });
    contents.on('will-redirect', (event) => event.preventDefault());
    contents.on('will-attach-webview', (event) => event.preventDefault());
    contents.session.setPermissionRequestHandler((_webContents, _permission, callback) => {
      callback(false);
    });
    contents.session.webRequest.onBeforeRequest((details, callback) => {
      callback({ cancel: !details.url.startsWith(allowedPrefix) });
    });
  }

  private resize(): void {
    if (this.active) this.resizeView(this.active.view);
  }

  private resizeView(view: WebContentsView): void {
    const [width, height] = this.window.getContentSize();
    view.setBounds({ x: 0, y: 0, width, height });
  }

  private settle(decision: PermissionDecision, destroy = true): void {
    const active = this.active;
    if (!active || active.settled) return;
    active.settled = true;
    this.active = undefined;
    if (destroy && !active.view.webContents.isDestroyed()) {
      this.window.contentView.removeChildView(active.view);
      active.view.webContents.close();
    }
    active.resolve(decision);
  }
}
