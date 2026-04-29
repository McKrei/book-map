import type { Node, Edge } from '@xyflow/react';
import type { AIAnalysisResult } from '../types';

const CHAPTER_WIDTH = 280;
const CHAPTER_HEIGHT = 80;
const EVENT_WIDTH = 260;
const EVENT_HEIGHT = 70;
const CHARACTER_WIDTH = 240;
const CHARACTER_HEIGHT = 100;
const CHANGE_WIDTH = 220;
const CHANGE_HEIGHT = 60;

const CHAPTER_GAP_X = 400;
const EVENT_GAP_Y = 120;
const CHARACTER_START_Y = -300;
const CHARACTER_GAP_X = 300;

export interface MapData {
  nodes: Node[];
  edges: Edge[];
}

export function buildMapFromAnalysis(analysis: AIAnalysisResult): MapData {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  const characterNodeMap = new Map<string, string>();

  analysis.characters.forEach((char, idx) => {
    const nodeId = `char-${idx}`;
    characterNodeMap.set(char.name.toLowerCase(), nodeId);

    nodes.push({
      id: nodeId,
      type: 'character',
      position: {
        x: idx * CHARACTER_GAP_X,
        y: CHARACTER_START_Y,
      },
      data: {
        name: char.name,
        description: char.description,
        color: char.color,
        firstAppearance: char.first_appearance_chapter,
      },
    });
  });

  analysis.chapters.forEach((chapter, chapterIdx) => {
    const chapterNodeId = `chapter-${chapterIdx}`;
    const chapterX = chapterIdx * CHAPTER_GAP_X;
    const chapterY = 0;

    nodes.push({
      id: chapterNodeId,
      type: 'chapter',
      position: { x: chapterX, y: chapterY },
      data: {
        title: chapter.title,
        summary: chapter.summary,
        order: chapter.order,
      },
    });

    if (chapterIdx > 0) {
      edges.push({
        id: `chapter-edge-${chapterIdx - 1}-${chapterIdx}`,
        source: `chapter-${chapterIdx - 1}`,
        target: chapterNodeId,
        type: 'smoothstep',
        style: { stroke: '#64748b', strokeWidth: 3 },
        animated: true,
      });
    }

    chapter.events.forEach((event, eventIdx) => {
      const eventNodeId = `event-${chapterIdx}-${eventIdx}`;
      const eventX = chapterX - (EVENT_WIDTH - CHAPTER_WIDTH) / 2;
      const eventY = chapterY + CHAPTER_HEIGHT + 40 + eventIdx * EVENT_GAP_Y;

      nodes.push({
        id: eventNodeId,
        type: 'event',
        position: { x: eventX, y: eventY },
        data: {
          title: event.title,
          description: event.description,
          eventType: event.event_type,
        },
      });

      const sourceId = eventIdx === 0 ? chapterNodeId : `event-${chapterIdx}-${eventIdx - 1}`;
      edges.push({
        id: `event-edge-${chapterIdx}-${eventIdx}`,
        source: sourceId,
        target: eventNodeId,
        type: 'smoothstep',
        style: { stroke: '#94a3b8', strokeWidth: 2 },
      });

      event.character_changes.forEach((change, changeIdx) => {
        const changeNodeId = `change-${chapterIdx}-${eventIdx}-${changeIdx}`;
        const changeX = eventX + EVENT_WIDTH + 40;
        const changeY = eventY + changeIdx * (CHANGE_HEIGHT + 10);

        const charNodeId = characterNodeMap.get(change.character_name.toLowerCase());
        const charColor = analysis.characters.find(
          (c) => c.name.toLowerCase() === change.character_name.toLowerCase()
        )?.color || '#6366f1';

        nodes.push({
          id: changeNodeId,
          type: 'characterChange',
          position: { x: changeX, y: changeY },
          data: {
            characterName: change.character_name,
            changeDescription: change.change_description,
            changeType: change.change_type,
            color: charColor,
          },
        });

        edges.push({
          id: `change-edge-${chapterIdx}-${eventIdx}-${changeIdx}`,
          source: eventNodeId,
          target: changeNodeId,
          type: 'smoothstep',
          style: { stroke: charColor, strokeWidth: 2, strokeDasharray: '5,5' },
        });

        if (charNodeId) {
          edges.push({
            id: `char-change-edge-${chapterIdx}-${eventIdx}-${changeIdx}`,
            source: charNodeId,
            target: changeNodeId,
            type: 'smoothstep',
            style: { stroke: charColor, strokeWidth: 1, opacity: 0.4 },
          });
        }
      });
    });
  });

  return { nodes, edges };
}

// Helper to get dimensions for node types (used for layout)
export function getNodeDimensions(type: string) {
  switch (type) {
    case 'chapter': return { width: CHAPTER_WIDTH, height: CHAPTER_HEIGHT };
    case 'event': return { width: EVENT_WIDTH, height: EVENT_HEIGHT };
    case 'character': return { width: CHARACTER_WIDTH, height: CHARACTER_HEIGHT };
    case 'characterChange': return { width: CHANGE_WIDTH, height: CHANGE_HEIGHT };
    default: return { width: 200, height: 60 };
  }
}
