import { app, ipcMain } from 'electron';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface LanguageFile { code: string; name: string; direction: 'ltr' | 'rtl'; strings: Record<string, string>; }

async function findLanguageDirectory(): Promise<string> {
  const candidates = app.isPackaged
    ? [
        path.join(process.resourcesPath, 'languages'),
        path.join(process.resourcesPath, 'app.asar.unpacked', 'dist', 'ai-chat', 'browser', 'languages'),
        path.join(process.resourcesPath, 'app', 'dist', 'ai-chat', 'browser', 'languages'),
      ]
    : [
        path.join(app.getAppPath(), 'public', 'languages'),
        path.join(app.getAppPath(), 'dist', 'ai-chat', 'browser', 'languages'),
      ];

  for (const candidate of candidates) {
    try {
      await fs.access(candidate);
      return candidate;
    } catch {
      // Try the next runtime layout.
    }
  }

  return candidates[0];
}

function isLanguageFile(value: unknown): value is LanguageFile {
  const language = value as Partial<LanguageFile> | null;

  return Boolean(
    language &&
      typeof language.code === 'string' &&
      /^[a-z0-9-]+$/i.test(language.code) &&
      typeof language.name === 'string' &&
      language.name.trim() &&
      (language.direction === 'ltr' || language.direction === 'rtl') &&
      language.strings &&
      typeof language.strings === 'object' &&
      !Array.isArray(language.strings),
  );
}

async function languages(): Promise<LanguageFile[]> {
  const dir = await findLanguageDirectory();
  const files = await fs.readdir(dir);
  const loaded: LanguageFile[] = [];
  const codes = new Set<string>();

  for (const file of files.filter((item) => item.endsWith('.json'))) {
    try {
      const parsed = JSON.parse(await fs.readFile(path.join(dir, file), 'utf8')) as unknown;
      if (!isLanguageFile(parsed)) {
        console.warn(`Skipping invalid language file: ${file}`);
        continue;
      }

      if (codes.has(parsed.code)) {
        console.warn(`Skipping duplicate language code "${parsed.code}" from ${file}`);
        continue;
      }

      codes.add(parsed.code);
      loaded.push(parsed);
    } catch (error) {
      console.warn(`Skipping unreadable language file: ${file}`, error);
    }
  }

  const english = loaded.find((language) => language.code === 'en');
  if (!english) {
    throw new Error('English language file is required.');
  }

  const englishStrings = english.strings;
  loaded.forEach((language) => {
    const missingKeys = Object.keys(englishStrings).filter((key) => !(key in language.strings));
    if (missingKeys.length) {
      console.warn(`Language "${language.code}" is missing ${missingKeys.length} translation keys. Falling back to English.`);
      language.strings = { ...englishStrings, ...language.strings };
    }
  });

  return loaded.sort((left, right) => left.name.localeCompare(right.name));
}

export function registerLanguageHandlers(): void {
  ipcMain.handle('languages:getAll', languages);
  ipcMain.handle('languages:list', async () => (await languages()).map(({ strings, ...item }) => item));
  ipcMain.handle('languages:get', async (_event, code: string) => {
    const language = (await languages()).find((item) => item.code === code);
    if (!language) throw new Error('Language not found');
    return language;
  });
}
