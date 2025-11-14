import fs from 'node:fs';
import path from 'node:path';
import type { FilterConditions, KeywordImportEntry, KeywordImportSummary, KeywordTask, PreparedKeywordPayload, RecordSearchResultInput, SkippedKeywordTask } from './types';

const dataDir = path.join(process.cwd(), 'data');
const dbPath = path.join(dataDir, 'database.json');

interface KeywordRow {
  id: number;
  keyword: string;
  translation: string | null;
  createdAt: string;
  updatedAt: string;
}

interface SearchResultRow {
  id: number;
  keywordId: number;
  keyword: string;
  translation: string | null;
  searchResults: number | null;
  maxMonthSales: number | null;
  maxReviews: number | null;
  meetsConditions: boolean;
  durationMs: number | null;
  error: string | null;
  zipCode: string | null;
  filters: FilterConditions;
  createdAt: string;
}

interface DatabaseFile {
  keywords: KeywordRow[];
  searchResults: SearchResultRow[];
  sequences: {
    keywordId: number;
    searchResultId: number;
  };
}

const DEFAULT_DB: DatabaseFile = {
  keywords: [],
  searchResults: [],
  sequences: {
    keywordId: 0,
    searchResultId: 0,
  },
};

const ensureDataDir = () => {
  fs.mkdirSync(dataDir, { recursive: true });
};

const readDatabase = (): DatabaseFile => {
  ensureDataDir();
  if (!fs.existsSync(dbPath)) {
    return { ...DEFAULT_DB, keywords: [], searchResults: [] };
  }

  const raw = fs.readFileSync(dbPath, 'utf-8');
  try {
    const parsed = JSON.parse(raw) as Partial<DatabaseFile> | null;
    if (!parsed || typeof parsed !== 'object') {
      return { ...DEFAULT_DB, keywords: [], searchResults: [] };
    }

    return {
      keywords: Array.isArray(parsed.keywords) ? parsed.keywords as KeywordRow[] : [],
      searchResults: Array.isArray(parsed.searchResults) ? parsed.searchResults as SearchResultRow[] : [],
      sequences: parsed.sequences ?? { ...DEFAULT_DB.sequences },
    };
  } catch (error) {
    console.warn('Failed to parse database file, reinitializing.', error);
    return { ...DEFAULT_DB, keywords: [], searchResults: [] };
  }
};

const writeDatabase = (db: DatabaseFile) => {
  ensureDataDir();
  const tempPath = `${dbPath}.tmp`;
  fs.writeFileSync(tempPath, JSON.stringify(db, null, 2), 'utf-8');
  fs.renameSync(tempPath, dbPath);
};

const normalizeTranslation = (value: unknown): string | null => {
  if (value === undefined || value === null) {
    return null;
  }
  const text = String(value).trim();
  return text.length > 0 ? text : null;
};

const nowIso = () => new Date().toISOString();

const getKeywordMap = (keywords: KeywordRow[]) => {
  const map = new Map<string, KeywordRow>();
  for (const row of keywords) {
    map.set(row.keyword, row);
  }
  return map;
};

export const importKeywordTranslations = (entries: KeywordImportEntry[]): KeywordImportSummary => {
  const summary: KeywordImportSummary = {
    total: entries.length,
    inserted: 0,
    updated: 0,
    unchanged: 0,
    skipped: 0,
  };

  if (entries.length === 0) {
    return summary;
  }

  const db = readDatabase();
  const keywordMap = getKeywordMap(db.keywords);
  const timestamp = nowIso();
  let hasChanges = false;

  for (const entry of entries) {
    const keyword = entry.keyword?.trim();
    if (!keyword) {
      summary.skipped += 1;
      continue;
    }

    const translation = normalizeTranslation(entry.translation ?? null);
    const existing = keywordMap.get(keyword);

    if (!existing) {
      db.sequences.keywordId += 1;
      const newKeyword: KeywordRow = {
        id: db.sequences.keywordId,
        keyword,
        translation,
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      db.keywords.push(newKeyword);
      keywordMap.set(keyword, newKeyword);
      summary.inserted += 1;
      hasChanges = true;
      continue;
    }

    if (!translation) {
      summary.unchanged += 1;
      continue;
    }

    if (existing.translation === translation) {
      summary.unchanged += 1;
      continue;
    }

    existing.translation = translation;
    existing.updatedAt = timestamp;
    summary.updated += 1;
    hasChanges = true;
  }

  if (hasChanges) {
    writeDatabase(db);
  }

  return summary;
};

export const prepareKeywordsForSearch = (
  rawKeywords: string[],
  windowDays: number
): PreparedKeywordPayload => {
  const db = readDatabase();
  const keywordMap = getKeywordMap(db.keywords);
  const seen = new Set<string>();
  const orderedKeywords: string[] = [];
  const timestamp = nowIso();
  let hasNewKeyword = false;

  for (const raw of rawKeywords) {
    const keyword = raw.trim();
    if (!keyword || seen.has(keyword)) {
      continue;
    }
    seen.add(keyword);
    orderedKeywords.push(keyword);

    if (!keywordMap.has(keyword)) {
      db.sequences.keywordId += 1;
      const newKeyword: KeywordRow = {
        id: db.sequences.keywordId,
        keyword,
        translation: null,
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      db.keywords.push(newKeyword);
      keywordMap.set(keyword, newKeyword);
      hasNewKeyword = true;
    }
  }

  if (hasNewKeyword) {
    writeDatabase(db);
  }

  const keywordsSet = new Set(orderedKeywords);
  const lastSearchMap = new Map<string, string>();

  for (const result of db.searchResults) {
    if (!keywordsSet.has(result.keyword)) {
      continue;
    }
    const current = lastSearchMap.get(result.keyword);
    if (!current || current < result.createdAt) {
      lastSearchMap.set(result.keyword, result.createdAt);
    }
  }

  const threshold = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);
  const tasks: KeywordTask[] = [];
  const skipped: SkippedKeywordTask[] = [];

  for (const keyword of orderedKeywords) {
    const record = keywordMap.get(keyword);
    if (!record) {
      continue;
    }

    const lastSearchedAt = lastSearchMap.get(keyword);
    if (lastSearchedAt && new Date(lastSearchedAt) >= threshold) {
      skipped.push({
        keywordId: record.id,
        keyword: record.keyword,
        translation: record.translation ?? undefined,
        lastSearchedAt,
      });
      continue;
    }

    tasks.push({
      keywordId: record.id,
      keyword: record.keyword,
      translation: record.translation ?? undefined,
      lastSearchedAt: lastSearchedAt ?? undefined,
    });
  }

  return { tasks, skipped };
};

export const recordSearchResult = (input: RecordSearchResultInput) => {
  const db = readDatabase();
  const keywordMap = getKeywordMap(db.keywords);
  const timestamp = nowIso();

  const translation = normalizeTranslation(input.translation ?? null);

  let keywordRecord = input.keywordId
    ? db.keywords.find((item) => item.id === input.keywordId)
    : keywordMap.get(input.keyword);

  if (!keywordRecord) {
    db.sequences.keywordId += 1;
    keywordRecord = {
      id: db.sequences.keywordId,
      keyword: input.keyword,
      translation,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    db.keywords.push(keywordRecord);
    keywordMap.set(keywordRecord.keyword, keywordRecord);
  } else {
    const updatedTranslation = translation ?? keywordRecord.translation;
    if (updatedTranslation !== keywordRecord.translation) {
      keywordRecord.translation = updatedTranslation;
      keywordRecord.updatedAt = timestamp;
    }
  }

  db.sequences.searchResultId += 1;
  const record: SearchResultRow = {
    id: db.sequences.searchResultId,
    keywordId: keywordRecord.id,
    keyword: keywordRecord.keyword,
    translation: keywordRecord.translation,
    searchResults: input.searchResults ?? null,
    maxMonthSales: input.maxMonthSales ?? null,
    maxReviews: input.maxReviews ?? null,
    meetsConditions: Boolean(input.meetsConditions),
    durationMs: input.duration ?? null,
    error: input.error ?? null,
    zipCode: input.zipCode ?? null,
    filters: input.filters,
    createdAt: timestamp,
  };

  db.searchResults.push(record);
  writeDatabase(db);
};
