import { readFile, writeFile, mkdir, chmod, unlink } from 'node:fs/promises';
import { dirname } from 'node:path';
import { CONFIG_DIR, CONFIG_PATH, TOKENS_PATH } from './config.js';

async function readJson(path) {
  try {
    const text = await readFile(path, 'utf8');
    return JSON.parse(text);
  } catch (e) {
    if (e.code === 'ENOENT') return null;
    throw e;
  }
}

async function writeJson(path, obj) {
  await mkdir(dirname(path), { recursive: true, mode: 0o700 });
  await writeFile(path, JSON.stringify(obj, null, 2), { mode: 0o600 });
  await chmod(path, 0o600);
}

export const loadConfig = () => readJson(CONFIG_PATH);
export const saveConfig = (c) => writeJson(CONFIG_PATH, c);

export const loadTokens = () => readJson(TOKENS_PATH);
export const saveTokens = (t) => writeJson(TOKENS_PATH, t);

export async function clearTokens() {
  try {
    await unlink(TOKENS_PATH);
  } catch (e) {
    if (e.code !== 'ENOENT') throw e;
  }
}

export { CONFIG_DIR };
