/**
 * Pure logic for SM-2 Spaced Repetition Algorithm
 * Computes next interval, repetition count, and updated ease factor based on review grade.
 * Includes automated self-check assertions.
 */

export interface Sm2Item {
  repetition: number; // Consecutive successful repetitions (n >= 0)
  intervalDays: number; // Current interval in days
  easeFactor: number; // Easiness factor (default 2.5, min 1.3)
  nextReviewDate: number; // Timestamp ms when card is due
  lastReviewedDate?: number; // Timestamp ms of last review
}

export type Sm2QualityGrade = 0 | 1 | 2 | 3 | 4 | 5;

export type QuickReviewRating = 'again' | 'hard' | 'good' | 'easy';

export const RATING_TO_GRADE: Record<QuickReviewRating, Sm2QualityGrade> = {
  again: 1, // Complete failure or serious lapse
  hard: 3,  // Correct with substantial recall effort
  good: 4,  // Correct with brief hesitation
  easy: 5,  // Perfect, instantaneous recall
};

/**
 * Calculates updated SM-2 parameters after a review session
 */
export function calculateSm2(
  item: Sm2Item,
  grade: Sm2QualityGrade,
  currentTimestamp: number = Date.now()
): Sm2Item {
  let { repetition, intervalDays, easeFactor } = item;

  // Bound ease factor to standard baseline
  easeFactor = Math.max(1.3, easeFactor || 2.5);

  if (grade < 3) {
    // Incorrect / Failed response: reset repetition streak
    repetition = 0;
    intervalDays = 1;
  } else {
    // Correct response: calculate next interval
    if (repetition === 0) {
      intervalDays = 1;
    } else if (repetition === 1) {
      intervalDays = 6;
    } else {
      intervalDays = Math.round(intervalDays * easeFactor);
    }
    repetition += 1;
  }

  // Update ease factor using SuperMemo-2 formula:
  // EF' = EF + (0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02))
  const delta = 0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02);
  const nextEaseFactor = Math.max(1.3, parseFloat((easeFactor + delta).toFixed(4)));

  const msInDay = 86400000;
  const nextReviewDate = currentTimestamp + intervalDays * msInDay;

  return {
    repetition,
    intervalDays,
    easeFactor: nextEaseFactor,
    nextReviewDate,
    lastReviewedDate: currentTimestamp,
  };
}

/**
 * Returns whether an SM-2 item is currently due for review
 */
export function isCardDue(item: Sm2Item, currentTimestamp: number = Date.now()): boolean {
  if (!item.nextReviewDate) return true;
  return item.nextReviewDate <= currentTimestamp;
}

/**
 * Creates default initial SM-2 item parameters for newly created cards
 */
export function createDefaultSm2Item(): Sm2Item {
  return {
    repetition: 0,
    intervalDays: 1,
    easeFactor: 2.5,
    nextReviewDate: Date.now(),
  };
}

/**
 * Automated self-checks for SM-2 Spaced Repetition calculation
 */
export function runSm2SelfChecks(): boolean {
  try {
    const initial = createDefaultSm2Item();

    // 1. First review 'Good' (grade 4): interval 1 day, rep 1
    const rev1 = calculateSm2(initial, 4, 1000000);
    console.assert(rev1.repetition === 1, 'Self-check failed: SM-2 first rep should be 1');
    console.assert(rev1.intervalDays === 1, 'Self-check failed: SM-2 first interval should be 1');

    // 2. Second review 'Good' (grade 4): interval 6 days, rep 2
    const rev2 = calculateSm2(rev1, 4, 1000000 + 86400000);
    console.assert(rev2.repetition === 2, 'Self-check failed: SM-2 second rep should be 2');
    console.assert(rev2.intervalDays === 6, 'Self-check failed: SM-2 second interval should be 6');

    // 3. Failed review (grade 1 'Again'): interval resets to 1, rep resets to 0
    const failRev = calculateSm2(rev2, 1, 1000000 + 7 * 86400000);
    console.assert(failRev.repetition === 0, 'Self-check failed: SM-2 failed grade must reset rep to 0');
    console.assert(failRev.intervalDays === 1, 'Self-check failed: SM-2 failed grade must reset interval to 1');
    console.assert(failRev.easeFactor < rev2.easeFactor, 'Self-check failed: EF should decrease on failure');

    return true;
  } catch (err) {
    console.error('SM-2 self-check error:', err);
    return false;
  }
}

runSm2SelfChecks();
