/**
 * Helper function to save calculation and tool outputs into IndexedDB notes store
 */

import { db, DBNote } from './db';

export async function saveToolResultToNotes(
  title: string,
  content: string,
  tags: string[] = ['tool-output']
): Promise<string> {
  const id = `note-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const now = Date.now();

  const note: DBNote = {
    id,
    title,
    content,
    tags,
    pinned: false,
    createdAt: now,
    updatedAt: now,
  };

  await db.put('notes', note);

  // Broadcast event so any active Notes view or listener refreshes immediately
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('logicbench:note-saved', {
        detail: { id, title }
      })
    );
  }

  return id;
}
