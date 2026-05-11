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
import { BookOpen, Users, Zap } from 'lucide-react';

import { ChapterNode } from './nodes/ChapterNode';
import { EventNode } from './nodes/EventNode';
import { CharacterNode } from './nodes/CharacterNode';
import { useBookStore } from '../../store/bookStore';
import { useThemeStore } from '../../store/themeStore';

const nodeTypes: NodeTypes = {
  chapter: ChapterNode,
  event: EventNode,
  character: CharacterNode,
};

interface BookMapProps {
  initialNodes: Node[];
  initialEdges: Edge[];
  bookTitle?: string;
}

export function BookMap({ initialNodes, initialEdges, bookTitle }: BookMapProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const { analysis } = useBookStore();
  const { theme } = useThemeStore();

  const handleNodeMouseEnter = useCallback((_: React.MouseEvent, node: Node) => {
    if (node.type !== 'character') return;

    const connectedEventIds = new Set<string>();
    setEdges((eds) =>
      eds.map((edge) => {
        const edgeData = edge.data as Record<string, unknown> | undefined;
        if (edgeData?.characterSource === node.id) {
          connectedEventIds.add(edge.target);
          return { ...edge, style: { ...edge.style, opacity: 1, strokeWidth: 3 }, animated: true };
        }
        if (edge.source === node.id || edge.target === node.id) {
          return { ...edge, style: { ...edge.style, opacity: 1, strokeWidth: 3 }, animated: true };
        }
        return { ...edge, style: { ...edge.style, opacity: 0 } };
      })
    );

    setNodes((nds) =>
      nds.map((n) => {
        if (n.id === node.id) return n;
        if (connectedEventIds.has(n.id)) {
          return { ...n, style: { ...n.style, filter: 'brightness(1.3)', zIndex: 10 } };
        }
        if (n.type === 'character') {
          return { ...n, style: { ...n.style, opacity: 0.25 } };
        }
        return { ...n, style: { ...n.style, opacity: 0.35 } };
      })
    );
  }, [setEdges, setNodes]);

  const handleNodeMouseLeave = useCallback((_: React.MouseEvent, node: Node) => {
    if (node.type !== 'character') return;

    setEdges((eds) =>
      eds.map((edge) => {
        const edgeData = edge.data as Record<string, unknown> | undefined;
        return {
          ...edge,
          animated: false,
          style: {
            ...edge.style,
            opacity: 0,
            strokeWidth: edgeData?.characterSource ? 1.5 : (edge.id.startsWith('ch-edge-') ? 2 : 1),
          },
        };
      })
    );

    setNodes((nds) =>
      nds.map((n) => ({
        ...n,
        style: { ...n.style, opacity: undefined, filter: undefined, zIndex: undefined },
      }))
    );
  }, [setEdges, setNodes]);

  const miniMapNodeColor = useCallback((node: Node) => {
    switch (node.type) {
      case 'chapter': return '#6366f1';
      case 'event': return '#60a5fa';
      case 'character': return (node.data as Record<string, string>).color || '#10b981';
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

  const bgColor = theme === 'dark' ? '#0a0e1a' : '#f8fafc';
  const dotColor = theme === 'dark' ? '#1e293b' : '#e2e8f0';
  const maskColor = theme === 'dark' ? 'rgba(10, 14, 26, 0.7)' : 'rgba(248, 250, 252, 0.7)';

  return (
    <div className="w-full h-full" style={{ background: bgColor }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeMouseEnter={handleNodeMouseEnter}
        onNodeMouseLeave={handleNodeMouseLeave}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        minZoom={0.02}
        maxZoom={2}
        defaultEdgeOptions={{
          type: 'smoothstep',
        }}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={24} size={1} color={dotColor} />
        <Controls />
        <MiniMap
          nodeColor={miniMapNodeColor}
          maskColor={maskColor}
        />

        {(bookTitle || stats) && (
          <Panel position="top-left" className="!m-4">
            <div
              className="neon-border rounded-2xl px-5 py-3.5 backdrop-blur-md"
              style={{ background: 'var(--bg-card)' }}
            >
              {bookTitle && (
                <h2
                  className="font-bold text-base mb-1.5 tracking-tight"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {bookTitle}
                </h2>
              )}
              {stats && (
                <div className="flex gap-4 text-[11px] font-medium" style={{ color: 'var(--text-muted)' }}>
                  <span className="flex items-center gap-1">
                    <BookOpen size={12} style={{ color: 'var(--neon-purple)' }} />
                    {stats.chapters} глав
                  </span>
                  <span className="flex items-center gap-1">
                    <Users size={12} style={{ color: 'var(--neon-cyan)' }} />
                    {stats.characters} персонажей
                  </span>
                  <span className="flex items-center gap-1">
                    <Zap size={12} style={{ color: 'var(--neon-blue)' }} />
                    {stats.events} событий
                  </span>
                </div>
              )}
            </div>
          </Panel>
        )}
      </ReactFlow>
    </div>
  );
}
