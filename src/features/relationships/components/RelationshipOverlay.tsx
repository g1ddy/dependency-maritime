
import { useRelationshipStore } from '../store';
import * as d3 from 'd3';
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";
import { useState, useMemo } from "react";
import type { RelationshipNode } from '../types';

interface RelationshipOverlayProps {
  onUploadClick: () => void;
}

const getId = (node: string | RelationshipNode) => typeof node === 'string' ? node : node.id;

export function RelationshipOverlay({ onUploadClick }: RelationshipOverlayProps) {
  const { nodes, links, selectNode, selectedNodeId } = useRelationshipStore();
  const [searchQuery, setSearchQuery] = useState("");

  const selectedNode = useMemo(() => nodes.find(n => n.id === selectedNodeId), [nodes, selectedNodeId]);

  const connections = useMemo(() => {
    if (!selectedNode) return [];
    return links
      .filter(l => getId(l.source) === selectedNode.id || getId(l.target) === selectedNode.id)
      .sort((a, b) => b.relationshipWeight - a.relationshipWeight);
  }, [selectedNode, links]);

  const uniqueClusters = useMemo(() => Array.from(new Set(nodes.map(d => d.cluster))).sort(), [nodes]);
  const color = useMemo(() => d3.scaleOrdinal(d3.schemeCategory10).domain(uniqueClusters), [uniqueClusters]);

  const searchResults = useMemo(() => {
    if (!searchQuery) return [];
    const lowerQuery = searchQuery.toLowerCase();
    return nodes.filter(n => n.id.toLowerCase().includes(lowerQuery));
  }, [searchQuery, nodes]);

  return (
    <>
      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-gray-800/80 backdrop-blur-sm p-4 rounded-lg border border-gray-700 text-sm pointer-events-none select-none z-10">
        <h3 className="font-bold mb-2 text-gray-200">Context Clusters</h3>
        <div className="space-y-1">
          {uniqueClusters.length > 0 ? uniqueClusters.map(cluster => (
            <div key={cluster} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color(cluster) }}></div>
              <span className="text-xs text-gray-300">{cluster}</span>
            </div>
          )) : <span className="text-gray-500 italic">No data loaded</span>}
        </div>
      </div>

      {/* Sidebar */}
      <aside className="absolute right-0 top-0 bottom-0 w-80 bg-gray-800 border-l border-gray-700 flex flex-col z-20 shadow-2xl">
        <div className="p-5 border-b border-gray-700 bg-gray-800">
          <h1 className="text-xl font-bold text-white mb-1">Network Analysis</h1>
          {nodes.length === 0 && (
            <Button onClick={onUploadClick} size="sm" className="w-full mt-2 gap-2">
              <Upload className="h-4 w-4" /> Load CSV Data
            </Button>
          )}
          {nodes.length > 0 && (
            <p className="text-xs text-gray-400">{nodes.length} Nodes, {links.length} Links</p>
          )}
        </div>

        <div className="px-5 py-3 border-b border-gray-700 bg-gray-800 relative">
          <input
            type="text"
            placeholder="Search for a component..."
            className="w-full bg-gray-900 text-sm text-gray-200 border border-gray-600 rounded px-3 py-2 focus:outline-none focus:border-blue-500 transition-colors placeholder:text-gray-500"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <div className="absolute left-5 right-5 mt-1 bg-gray-700 border border-gray-600 rounded shadow-xl max-h-48 overflow-y-auto text-sm z-50">
              {searchResults.length > 0 ? searchResults.map(node => (
                <div
                  key={node.id}
                  className="px-3 py-2 cursor-pointer hover:bg-gray-600 text-gray-200 border-b border-gray-600 last:border-0"
                  onClick={() => {
                    selectNode(node.id);
                    setSearchQuery("");
                  }}
                >
                  {node.id} <span className="text-xs text-gray-400 ml-1">({node.role})</span>
                </div>
              )) : (
                <div className="px-3 py-2 text-gray-400 italic">No matches found</div>
              )}
            </div>
          )}
        </div>

        <div className="p-5 overflow-y-auto flex-1 text-sm text-gray-300 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
          {selectedNode ? (
            <div>
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-white mb-1">{selectedNode.id}</h2>
                <div className="inline-block px-2 py-1 rounded text-xs font-semibold mb-2" style={{ backgroundColor: `${color(selectedNode.cluster)}80`, border: `1px solid ${color(selectedNode.cluster)}` }}>
                  {selectedNode.cluster}
                </div>
                <p className="text-gray-400 font-medium">Role: <span className="text-gray-200">{selectedNode.role}</span></p>
                <p className="text-gray-400 mt-1">Total Connections: <span className="text-gray-200">{selectedNode.degree}</span></p>
              </div>

              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider border-b border-gray-700 pb-2 mb-3">Documented Links</h3>
              <div className="space-y-4">
                {connections.length === 0 ? (
                  <p className="italic text-gray-500">No connections found.</p>
                ) : (
                    <div className="space-y-4">
                      {connections.map((link, i) => (
                        <div key={i} className="bg-gray-700/50 rounded p-3 border border-gray-700">
                          <div className="flex justify-between items-start mb-1">
                          <span className="font-medium text-blue-400">
                            {typeof link.source === 'object' ? link.source.id : link.source} ↔ {typeof link.target === 'object' ? link.target.id : link.target}
                          </span>
                            <span className="text-xs bg-gray-600 px-1.5 py-0.5 rounded text-gray-300">{link.relationshipWeight}</span>
                        </div>

                        <div className="text-xs text-gray-400 space-y-1">
                          <div><span className="font-semibold text-gray-500">Rel:</span> {link.relationship} <span className="text-gray-600">({link.relationshipType})</span></div>
                            <div><span className="font-semibold text-gray-500">Domain:</span> {link.targetDomain}</div>
                            {(link.relationshipStart || link.relationshipEnd) && (
                              <div><span className="font-semibold text-gray-500">Timeline:</span> {link.relationshipStart || '?'} - {link.relationshipEnd || '?'}</div>
                          )}
                        </div>

                        <div className="mt-2 pt-2 border-t border-gray-600/50 text-xs text-gray-400">
                          <div className="mb-1"><span className="font-semibold text-gray-500">Ref:</span> {link.referenceType}</div>
                          <div className="mb-1"><span className="font-semibold text-gray-500">Ctx:</span> {link.referenceContext}</div>
                          {link.notes && (
                            <div className="mt-2 p-2 bg-yellow-900/20 text-yellow-200/80 rounded italic border border-yellow-900/30">
                              "{link.notes}"
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center text-gray-500 mt-10">
              <p>Click on any node in the graph to view detailed connection data.</p>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
