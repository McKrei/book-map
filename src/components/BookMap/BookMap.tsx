import { useCallback, useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  BackgroundVariant,
  type NodeTypes,
  type Node,
  type Edge,
  Panel,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { ChapterNode } from './nodes/ChapterNode';
import { EventNode } from './nodes/EventNode';
import { CharacterNode } from './nodes/CharacterNode';
import { CharacterChangeNode } from './nodes/CharacterChangeNode';
import { useBookStore } from '../../store/bookStore';

const nodeTypes: NodeTypes = {
  chapter: ChapterNode,
  event: EventNode,
  character: CharacterNode,
  characterChange: CharacterChangeNode,
};

interface BookMapProps {
  initialNodes: Node[];
  initialEdges: Edge[];
  bookTitle?: string;
}

export function BookMap({ initialNodes, initialEdges, bookTitle }: BookMapProps) {
  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);
  const { analysis } = useBookStore();

  const miniMapNodeColor = useCallback((node: Node) => {
    switch (node.type) {
      case 'chapter': return '#6366f1';
      case 'event': return '#f59e0b';
      case 'character': return (node.data as Record<string, string>).color || '#10b981';
      case 'characterChange': return (node.data as Record<string, string>).color || '#8b5cf6';
      default: return '#64748b';
    }
  }, []);

  const stats = useMemo(() => {
    if (!analysis) return null;
    return {
      chapters: analysis.chapters.length,
      characters: analysis.characters.length,
      events: analysis.chapters.reduce((sum, ch) => sum + ch.events.length, 0),
    };
  }, [analysis]);

  return (
    <div className="w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.05}
        maxZoom={2}
        defaultEdgeOptions={{
          type: 'smoothstep',
        }}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#334155" />
        <Controls
          className="!bg-slate-800 !border-slate-600 !shadow-xl [&>button]:!bg-slate-700 [&>button]:!border-slate-600 [&>button]:!text-white [&>button:hover]:!bg-slate-600"
        />
        <MiniMap
          nodeColor={miniMapNodeColor}
          className="!bg-slate-900 !border-slate-700"
          maskColor="rgba(15, 23, 42, 0.7)"
        />

        {(bookTitle || stats) && (
          <Panel position="top-left" className="!m-4">
            <div className="bg-slate-800/90 backdrop-blur-sm border border-slate-700 rounded-xl px-5 py-3 shadow-xl">
              {bookTitle && (
                <h2 className="text-white font-bold text-lg mb-1">{bookTitle}</h2>
              )}
              {stats && (
                <div className="flex gap-4 text-xs text-slate-400">
                  <span>📖 {stats.chapters} глав</span>
                  <span>👤 {stats.characters} персонажей</span>
                  <span>⚡ {stats.events} событий</span>
                </div>
              )}
            </div>
          </Panel>
        )}
      </ReactFlow>
    </div>
  );
}
