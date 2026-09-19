import fs from 'node:fs';
import path from 'node:path';
import { extractError } from './errors.js';
import { writableDir } from './paths.js';

function sanitizePair(name, value) {
  const cleanName = String(name ?? '')
    .replace(/[\s\x00-\x1f\x7f;=]+/g, '')
    .trim();
  const cleanValue = String(value ?? '')
    .replace(/[\x00-\x1f\x7f;]+/g, '')
    .trim();
  if (!cleanName) return null;
  return { name: cleanName, value: cleanValue };
}

export function splitCookiePairs(cookie) {
  return String(cookie || '')
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const eq = part.indexOf('=');
      if (eq <= 0) return null;
      return sanitizePair(part.slice(0, eq), part.slice(eq + 1));
    })
    .filter(Boolean);
}

function pairsToString(pairs) {
  return pairs.map(({ name, value }) => `${name}=${value}`).join('; ');
}

function parseNetscapeCookies(text) {
  const pairs = [];
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.replace(/^#HttpOnly_/, '');
    if (!line.trim() || line.trim().startsWith('#')) continue;
    const parts = line.split('\t');
    if (parts.length < 7) continue;
    const pair = sanitizePair(parts[5], parts[6]);
    if (pair) pairs.push(pair);
  }
  return pairs;
}

function looksLikeNetscape(text) {
  return text.includes('\t') || /^#HttpOnly_/m.test(text) || /^#\s*Netscape/m.test(text);
}

function parseCookieInputInternal(input) {
  if (typeof input !== 'string' || !input.trim()) return null;
  const text = input.trim();

  if (text.startsWith('[') || text.startsWith('{')) {
    try {
      const data = JSON.parse(text);
      const list = Array.isArray(data) ? data : Array.isArray(data?.cookies) ? data.cookies : null;
      if (list) {
        const pairs = list
          .filter((entry) => entry && typeof entry.name === 'string')
          .map((entry) => sanitizePair(entry.name, String(entry.value ?? '')))
          .filter(Boolean);
        if (pairs.length > 0) return pairsToString(pairs);
      }
    } catch {}
  }

  if (looksLikeNetscape(text)) {
    const pairs = parseNetscapeCookies(text);
    if (pairs.length > 0) return pairsToString(pairs);
  }

  const headerMatch = /(?:-H|--header)\s+(['"])cookie:\s*([^'"]+)\1/i.exec(text);
  const candidate = headerMatch ? headerMatch[2] : text;
  const pairs = splitCookiePairs(candidate);
  if (pairs.length === 0) return null;
  return pairsToString(pairs);
}

export function parseCookieInput(input) {
  const parsed = parseCookieInputInternal(input);
  if (!parsed) throw extractError('INVALID_COOKIE', 'No cookie pairs found in input');
  return parsed;
}

export function defaultDataDir() {
  return path.join(writableDir(), 'data');
}

export function createSettings(dataDir = defaultDataDir()) {
  const file = path.join(dataDir, 'cookie.json');

  function read() {
    try {
      const data = JSON.parse(fs.readFileSync(file, 'utf8'));
      if (data && typeof data.cookie === 'string' && data.cookie) return data;
    } catch {}
    return null;
  }

  function getCookie() {
    const data = read();
    if (!data) return null;
    const cookie = parseCookieInputInternal(data.cookie);
    if (cookie && cookie !== data.cookie) {
      try {
        fs.writeFileSync(file, JSON.stringify({ ...data, cookie }, null, 2), 'utf8');
      } catch {}
    }
    return cookie;
  }

  function getStatus() {
    const data = read();
    if (!data) return { configured: false, cookieCount: 0, updatedAt: null };
    const cookie = parseCookieInputInternal(data.cookie);
    if (!cookie) return { configured: false, cookieCount: 0, updatedAt: null };
    return {
      configured: true,
      cookieCount: splitCookiePairs(cookie).length,
      updatedAt: data.updatedAt || null,
    };
  }

  function saveCookie(input) {
    const cookie = parseCookieInput(input);
    const data = { cookie, updatedAt: new Date().toISOString() };
    fs.mkdirSync(dataDir, { recursive: true });
    fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
    return { configured: true, cookieCount: splitCookiePairs(cookie).length, updatedAt: data.updatedAt };
  }

  function clearCookie() {
    try {
      fs.rmSync(file, { force: true });
    } catch {}
    return { configured: false, cookieCount: 0, updatedAt: null };
  }

  return { getCookie, getStatus, saveCookie, clearCookie };
}
