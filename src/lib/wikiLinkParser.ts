/**
 * Wiki-Link Parser and Knowledge Graph Analysis for LogicBench
 * Pure functions with self-checks for extracting links, computing backlinks, and building graph structures.
 */

import { DBNote } from './db';

export interface GraphNode {
  id: string;
  title: string;
  tags: string[];
  inDegree: number;
  outDegree: number;
  totalDegree: number;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
}

export interface GraphEdge {
  id: string;
  sourceId: string;
  targetId: string;
  targetTitle: string;
}

export interface BacklinkResult {
  sourceNote: DBNote;
  matchedText: string;
  snippet: string;
}

/**
 * Extracts wiki-link targets: [[target]] or [[target|label]]
 */
export function extractWikiLinks(content: string): { target: string; label?: string }[] {
  if (!content) return [];
  const regex = /\[\[(.*?)(?:\|(.*?))?\]\]/g;
  const links: { target: string; label?: string }[] = [];
  let match: RegExpExecArray | null;

  while ((match = regex.exec(content)) !== null) {
    const rawTarget = match[1]?.trim();
    const rawLabel = match[2]?.trim();
    if (rawTarget) {
      links.push({
        target: rawTarget,
        label: rawLabel || rawTarget
      });
    }
  }

  return links;
}

/**
 * Finds all notes in the database that link to the target note (by title or ID)
 */
export function findBacklinks(
  targetNote: DBNote,
  allNotes: DBNote[]
): BacklinkResult[] {
  const targetTitleLower = targetNote.title.trim().toLowerCase();
  const targetId = targetNote.id;
  const backlinks: BacklinkResult[] = [];

  for (const note of allNotes) {
    if (note.id === targetId) continue; // Skip self-links in backlink panel

    const extracted = extractWikiLinks(note.content);
    const hasLink = extracted.some(
      (link) =>
        link.target.toLowerCase() === targetTitleLower ||
        link.target === targetId
    );

    if (hasLink) {
      // Find a contextual snippet around the wiki-link
      const lowerContent = note.content.toLowerCase();
      let matchIdx = lowerContent.indexOf(`[[${targetTitleLower}`);
      if (matchIdx === -1) {
        matchIdx = lowerContent.indexOf(`[[${targetId.toLowerCase()}`);
      }

      let snippet = '';
      if (matchIdx !== -1) {
        const start = Math.max(0, matchIdx - 40);
        const end = Math.min(note.content.length, matchIdx + targetTitleLower.length + 60);
        snippet = (start > 0 ? '...' : '') + note.content.slice(start, end).replace(/\n/g, ' ') + (end < note.content.length ? '...' : '');
      } else {
        snippet = note.content.slice(0, 100).replace(/\n/g, ' ') + '...';
      }

      backlinks.push({
        sourceNote: note,
        matchedText: targetNote.title,
        snippet
      });
    }
  }

  return backlinks;
}

/**
 * Builds nodes and directed edges for the entire notes knowledge graph
 */
export function buildNoteGraph(notes: DBNote[]): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const nodeMap = new Map<string, GraphNode>();
  const titleToIdMap = new Map<string, string>();

  // 1. Initialize all existing notes as nodes
  for (const n of notes) {
    const node: GraphNode = {
      id: n.id,
      title: n.title,
      tags: n.tags || [],
      inDegree: 0,
      outDegree: 0,
      totalDegree: 0
    };
    nodeMap.set(n.id, node);
    titleToIdMap.set(n.title.trim().toLowerCase(), n.id);
  }

  const edges: GraphEdge[] = [];
  const edgeSet = new Set<string>();

  // 2. Discover edges from wiki-links
  for (const n of notes) {
    const links = extractWikiLinks(n.content);
    for (const link of links) {
      const targetTitleLower = link.target.trim().toLowerCase();
      let targetId = titleToIdMap.get(targetTitleLower);

      if (!targetId && nodeMap.has(link.target)) {
        targetId = link.target;
      }

      // If target exists as a note, create an edge
      if (targetId) {
        const edgeKey = `${n.id}->${targetId}`;
        if (!edgeSet.has(edgeKey)) {
          edgeSet.add(edgeKey);
          edges.push({
            id: edgeKey,
            sourceId: n.id,
            targetId,
            targetTitle: link.target
          });

          // Update degree counts
          const srcNode = nodeMap.get(n.id);
          const tgtNode = nodeMap.get(targetId);
          if (srcNode) {
            srcNode.outDegree += 1;
            srcNode.totalDegree += 1;
          }
          if (tgtNode) {
            tgtNode.inDegree += 1;
            tgtNode.totalDegree += 1;
          }
        }
      }
    }
  }

  return {
    nodes: Array.from(nodeMap.values()),
    edges
  };
}

// ----------------------------------------------------
// SELF-CHECK ASSERTIONS
// ----------------------------------------------------
(() => {
  const sample = "Check [[Oscilloscope Probes|Probes]] and [[I2C Bus]] for timing.";
  const links = extractWikiLinks(sample);
  if (links.length !== 2) {
    console.error('Self-check assertion failed: extractWikiLinks length');
  }
  if (links[0].target !== 'Oscilloscope Probes' || links[0].label !== 'Probes') {
    console.error('Self-check assertion failed: extractWikiLinks parsing target/label');
  }
  if (links[1].target !== 'I2C Bus' || links[1].label !== 'I2C Bus') {
    console.error('Self-check assertion failed: extractWikiLinks without alias');
  }
})();
