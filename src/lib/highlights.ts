import { supabase } from './supabase';

/**
 * Verses a person highlighted in «إصحاح النهارده» (only they can see them).
 * Saved in the database; if that's not available yet, kept on this device.
 */
const LOCAL_KEY = 'apostles-verse-highlights';

type HighlightMap = Record<string, number[]>; // assignmentId → verse numbers

function readLocal(): HighlightMap {
  try {
    const value = JSON.parse(window.localStorage.getItem(LOCAL_KEY) ?? '{}');
    return value && typeof value === 'object' ? (value as HighlightMap) : {};
  } catch {
    return {};
  }
}

function writeLocal(map: HighlightMap) {
  try {
    window.localStorage.setItem(LOCAL_KEY, JSON.stringify(map));
  } catch {
    /* storage unavailable */
  }
}

function setLocal(assignmentId: string, verse: number, on: boolean) {
  const map = readLocal();
  const current = new Set(map[assignmentId] ?? []);
  if (on) current.add(verse);
  else current.delete(verse);
  map[assignmentId] = [...current].sort((a, b) => a - b);
  writeLocal(map);
}

let useDatabase = true;

export async function fetchHighlights(assignmentIds: string[], localOnly = false): Promise<HighlightMap> {
  const local = readLocal();
  const pick = (map: HighlightMap) => Object.fromEntries(assignmentIds.map((id) => [id, map[id] ?? []]));
  if (localOnly || !useDatabase || assignmentIds.length === 0) return pick(local);
  const { data, error } = await supabase
    .from('reading_highlights')
    .select('assignment_id, verse_number')
    .in('assignment_id', assignmentIds);
  if (error) {
    useDatabase = false; // table not created yet → this device only
    return pick(local);
  }
  const map: HighlightMap = {};
  for (const row of (data ?? []) as Array<{ assignment_id: string; verse_number: number }>) {
    (map[row.assignment_id] ??= []).push(row.verse_number);
  }
  for (const id of Object.keys(map)) map[id].sort((a, b) => a - b);
  return pick(map);
}

export async function setHighlight(assignmentId: string, verse: number, on: boolean, localOnly = false): Promise<void> {
  if (localOnly || !useDatabase) {
    setLocal(assignmentId, verse, on);
    return;
  }
  const query = on
    ? supabase.from('reading_highlights').insert({ assignment_id: assignmentId, verse_number: verse })
    : supabase.from('reading_highlights').delete().eq('assignment_id', assignmentId).eq('verse_number', verse);
  const { error } = await query;
  if (error && error.code !== '23505') {
    useDatabase = false;
    setLocal(assignmentId, verse, on);
  }
}
