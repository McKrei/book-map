import type { Node, Edge } from '@xyflow/react';
import type { AIAnalysisResult } from '../types';

const EVENT_NODE_WIDTH = 340;
const EVENT_BASE_HEIGHT = 130;
const CHANGE_EXTRA_HEIGHT = 52;
const CHARACTER_GAP_X = 320;
const CHARACTER_ROW_Y = 0;
const CHAPTER_START_Y = 250;
const CHAPTER_GAP_X = 30;
const CHAPTER_PADDING_X = 30;
const CHAPTER_HEADER_HEIGHT = 80;
const EVENT_GAP_Y = 25;
const CHAPTER_PADDING_BOTTOM = 30;

export interface MapData {
  nodes: Node[];
  edges: Edge[];
}

function estimateEventHeight(event: { character_changes: unknown[] }): number {
  const changesCount = event.character_changes?.length || 0;
  return EVENT_BASE_HEIGHT + changesCount * CHANGE_EXTRA_HEIGHT;
}

export function buildMapFromAnalysis(analysis: AIAnalysisResult): MapData {
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  const characterNodeMap = new Map<string, string>();
  const characterColorMap = new Map<string, string>();

  // --- Characters row ---
  analysis.characters.forEach((char, idx) => {
    const nodeId = `char-${idx}`;
    characterNodeMap.set(char.name.toLowerCase(), nodeId);
    characterColorMap.set(char.name.toLowerCase(), char.color);

    nodes.push({
      id: nodeId,
      type: 'character',
      position: {
        x: idx * CHARACTER_GAP_X,
        y: CHARACTER_ROW_Y,
      },
      data: {
        name: char.name,
        description: char.description,
        color: char.color,
        firstAppearance: char.first_appearance_chapter,
      },
    });
  });

  // --- Calculate chapter sizes first ---
  const chapterSizes: { width: number; height: number; eventHeights: number[] }[] = [];
  for (const chapter of analysis.chapters) {
    const eventHeights = chapter.events.map((ev) => estimateEventHeight(ev));
    const totalEventsHeight = eventHeights.reduce((sum, h) => sum + h, 0);
    const gaps = Math.max(0, chapter.events.length - 1) * EVENT_GAP_Y;
    const containerWidth = EVENT_NODE_WIDTH + CHAPTER_PADDING_X * 2;
    const containerHeight = CHAPTER_HEADER_HEIGHT + totalEventsHeight + gaps + CHAPTER_PADDING_BOTTOM;
    chapterSizes.push({ width: containerWidth, height: containerHeight, eventHeights });
  }

  // --- Place chapters and events ---
  let chapterX = 0;

  analysis.chapters.forEach((chapter, chapterIdx) => {
    const chapterNodeId = `chapter-${chapterIdx}`;
    const size = chapterSizes[chapterIdx];

    // Chapter container node (rendered as large bg)
    nodes.push({
      id: chapterNodeId,
      type: 'chapter',
      position: { x: chapterX, y: CHAPTER_START_Y },
      data: {
        title: chapter.title,
        summary: chapter.summary,
        order: chapter.order,
        containerWidth: size.width,
        containerHeight: size.height,
      },
      style: { zIndex: 0 },
    });

    // Connect chapters sequentially
    if (chapterIdx > 0) {
      edges.push({
        id: `ch-edge-${chapterIdx}`,
        source: `chapter-${chapterIdx - 1}`,
        target: chapterNodeId,
        type: 'smoothstep',
        style: { stroke: '#6366f1', strokeWidth: 2, opacity: 0.6 },
        animated: true,
      });
    }

    // Events inside chapter
    let eventY = CHAPTER_HEADER_HEIGHT;

    chapter.events.forEach((event, eventIdx) => {
      const eventNodeId = `event-${chapterIdx}-${eventIdx}`;

      const characterChanges = (event.character_changes || []).map((change) => ({
        characterName: change.character_name,
        changeDescription: change.change_description,
        changeType: change.change_type,
        color: characterColorMap.get(change.character_name.toLowerCase()) || '#6366f1',
      }));

      nodes.push({
        id: eventNodeId,
        type: 'event',
        position: {
          x: CHAPTER_PADDING_X,
          y: eventY,
        },
        parentId: chapterNodeId,
        extent: 'parent' as const,
        data: {
          title: event.title,
          description: event.description,
          eventType: event.event_type,
          characterChanges,
        },
        style: { zIndex: 1 },
      });

      // Edge from previous event or chapter-top
      if (eventIdx > 0) {
        edges.push({
          id: `ev-edge-${chapterIdx}-${eventIdx}`,
          source: `event-${chapterIdx}-${eventIdx - 1}`,
          target: eventNodeId,
          type: 'smoothstep',
          style: { stroke: '#6366f1', strokeWidth: 1, opacity: 0.2, strokeDasharray: '4 4' },
        });
      }

      // Edges from characters to events they participate in
      for (const change of event.character_changes || []) {
        const charNodeId = characterNodeMap.get(change.character_name.toLowerCase());
        const charColor = characterColorMap.get(change.character_name.toLowerCase()) || '#6366f1';
        if (charNodeId) {
          edges.push({
            id: `char-ev-${chapterIdx}-${eventIdx}-${change.character_name}`,
            source: charNodeId,
            target: eventNodeId,
            type: 'smoothstep',
            style: { stroke: charColor, strokeWidth: 1.5, opacity: 0.25 },
            data: { characterSource: charNodeId },
          });
        }
      }

      eventY += size.eventHeights[eventIdx] + EVENT_GAP_Y;
    });

    chapterX += size.width + CHAPTER_GAP_X;
  });

  return { nodes, edges };
}
