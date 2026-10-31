/**
 * Helper to generate SM-2 spaced repetition flashcards from note contents or selected text
 */

import { db, DBFlashcard } from './db';

export interface ExtractedCardCandidate {
  question: string;
  answer: string;
  category: string;
}

/**
 * Extracts candidate questions and answers from markdown text or user selection
 */
export function extractFlashcardsFromMarkdown(
  markdown: string,
  selectedText?: string,
  noteTitle: string = 'Note'
): ExtractedCardCandidate[] {
  const textToProcess = (selectedText && selectedText.trim().length > 5) ? selectedText : markdown;
  const candidates: ExtractedCardCandidate[] = [];

  // Pattern 1: Explicit Q: and A:
  const qaRegex = /(?:^|\n)\s*(?:Q:|Question:|\?)\s*([^\n]+)\n\s*(?:A:|Answer:)\s*([^\n]+(?:\n(?!(?:Q:|Question:|\?))[^\n]+)*)/gi;
  let match: RegExpExecArray | null;
  while ((match = qaRegex.exec(textToProcess)) !== null) {
    const q = match[1]?.trim();
    const a = match[2]?.trim();
    if (q && a) {
      candidates.push({
        question: q,
        answer: a,
        category: noteTitle
      });
    }
  }

  // Pattern 2: Markdown Headings (e.g. ## Heading or ### Heading)
  const headingRegex = /(?:^|\n)(#{2,4})\s+([^\n]+)\n([\s\S]*?)(?=(?:\n#{2,4}\s+)|$)/g;
  while ((match = headingRegex.exec(textToProcess)) !== null) {
    const heading = match[2]?.trim();
    const body = match[3]?.trim();
    if (heading && body && body.length > 10) {
      // Avoid headings that are purely navigation or tables
      const firstParagraph = body.split('\n\n')[0].trim();
      if (firstParagraph && !candidates.some(c => c.question === heading)) {
        candidates.push({
          question: heading.endsWith('?') ? heading : `What is ${heading}?`,
          answer: firstParagraph.replace(/\[\[(.*?)\]\]/g, '$1'), // strip wiki link brackets
          category: noteTitle
        });
      }
    }
  }

  // Pattern 3: Bullet Definitions (e.g. - Term: Definition or * Term: Definition)
  const bulletRegex = /(?:^|\n)\s*[-*]\s+\*\*([^*]+)\*\*:\s*([^\n]+)/g;
  while ((match = bulletRegex.exec(textToProcess)) !== null) {
    const term = match[1]?.trim();
    const def = match[2]?.trim();
    if (term && def && !candidates.some(c => c.question.includes(term))) {
      candidates.push({
        question: `Define / explain: ${term}`,
        answer: def.replace(/\[\[(.*?)\]\]/g, '$1'),
        category: noteTitle
      });
    }
  }

  // Fallback: If nothing matched but text was explicitly selected, create a single card
  if (candidates.length === 0 && selectedText && selectedText.trim().length > 10) {
    const lines = selectedText.trim().split('\n').filter(l => l.trim().length > 0);
    if (lines.length === 1) {
      candidates.push({
        question: `Explain context from "${noteTitle}":`,
        answer: lines[0],
        category: noteTitle
      });
    } else {
      candidates.push({
        question: lines[0].replace(/^#+\s*/, ''),
        answer: lines.slice(1).join('\n'),
        category: noteTitle
      });
    }
  }

  return candidates;
}

/**
 * Persists created flashcards into the IndexedDB database
 */
export async function saveFlashcardsToDb(
  cards: ExtractedCardCandidate[],
  deckId: string = 'general',
  noteTitle: string = 'Note'
): Promise<number> {
  const now = Date.now();
  let savedCount = 0;

  for (const card of cards) {
    if (!card.question.trim() || !card.answer.trim()) continue;

    const id = `fc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const dbCard: DBFlashcard = {
      id,
      deckId,
      question: card.question.trim(),
      answer: card.answer.trim(),
      category: card.category || noteTitle,
      difficulty: 0,
      lastReviewed: 0,
      interval: 1,
      repetition: 0,
      easeFactor: 2.5,
      nextReviewDate: now,
      tags: ['from-note', noteTitle.toLowerCase().replace(/\s+/g, '-')],
      updatedAt: now
    };

    await db.put('flashcards', dbCard);
    savedCount++;
  }

  return savedCount;
}
