import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { useRelationshipStore } from '../store';
import type { RelationshipNode, RelationshipLink } from '../types';

export function RelationshipGraph() {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const { nodes, links, selectNode, selectedNodeId } = useRelationshipStore();

  // Use a ref for selectedNodeId to access the latest value inside d3 event handlers
  // without re-running the simulation effect when selection changes.
  const selectedNodeIdRef = useRef(selectedNodeId);
  useEffect(() => {
    selectedNodeIdRef.current = selectedNodeId;
  }, [selectedNodeId]);

  useEffect(() => {
    if (!containerRef.current || !svgRef.current || nodes.length === 0) return;

    // Deep clone nodes and links to avoid mutating Zustand store state
    const simulationNodes = nodes.map(d => ({ ...d }));
    const simulationLinks = links.map(d => ({
        ...d,
        // Ensure source/target are IDs for D3 to resolve
        source: typeof d.source === 'object' ? d.source.id : d.source,
        target: typeof d.target === 'object' ? d.target.id : d.target
    }));

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    const svg = d3.select(svgRef.current)
        .attr("width", width)
        .attr("height", height)
        .attr("viewBox", [0, 0, width, height]);

    svg.selectAll("*").remove(); // Clear previous render

    const g = svg.append("g");

    // Zoom
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on("zoom", (event: d3.D3ZoomEvent<SVGSVGElement, unknown>) => {
        g.attr("transform", event.transform.toString());
      });

    svg.call(zoom);

    // Simulation
    const simulation = d3.forceSimulation<RelationshipNode>(simulationNodes)
        .force("link", d3.forceLink<RelationshipNode, RelationshipLink>(simulationLinks).id(d => d.id).distance(120))
        .force("charge", d3.forceManyBody().strength(-400))
        .force("center", d3.forceCenter(width / 2, height / 2))
        .force("collide", d3.forceCollide<RelationshipNode>().radius((d) => (d.degree ? 5 + Math.min(d.degree * 2, 25) : 5) + 5).iterations(2));

    // Color Scale
    const uniqueClusters = Array.from(new Set(simulationNodes.map(d => d.cluster)));
    const color = d3.scaleOrdinal(d3.schemeCategory10).domain(uniqueClusters);

    // Helpers
    const getRadius = (d: RelationshipNode) => 5 + Math.min(d.degree * 2, 25);
    const isConnected = (a: RelationshipNode, b: RelationshipNode) => {
        // Use simulationLinks which have been resolved by D3 (source/target are nodes)
        return simulationLinks.some(l => {
             // Cast to unknown first to satisfy TS2352 (casting string|Node to Node directly is unsafe if TS thinks it might be string)
             // But we know simulation has run, so they are Nodes.
             const sourceId = (l.source as unknown as RelationshipNode).id;
             const targetId = (l.target as unknown as RelationshipNode).id;
             return (sourceId === a.id && targetId === b.id) || (sourceId === b.id && targetId === a.id);
        });
    }

    // Draw Links
    const link = g.append("g")
        .attr("class", "links")
        .selectAll<SVGLineElement, RelationshipLink>("line")
        .data(simulationLinks)
        .join("line")
        .attr("stroke", "#4b5563")
        .attr("stroke-opacity", 0.6)
        .attr("stroke-width", d => Math.max(1, Math.log10(d.relationshipWeight + 1) * 3));

    // Draw Nodes
    const node = g.append("g")
        .attr("class", "nodes")
        .selectAll<SVGCircleElement, RelationshipNode>("circle")
        .data(simulationNodes)
        .join("circle")
        .attr("r", d => getRadius(d))
        .attr("fill", d => color(d.cluster))
        .attr("stroke", "#374151")
        .attr("stroke-width", 1.5)
        .call(d3.drag<SVGCircleElement, RelationshipNode, RelationshipNode>()
            .on("start", (event: d3.D3DragEvent<SVGCircleElement, RelationshipNode, RelationshipNode>, d) => {
                if (!event.active) simulation.alphaTarget(0.3).restart();
                d.fx = d.x;
                d.fy = d.y;
            })
            .on("drag", (event: d3.D3DragEvent<SVGCircleElement, RelationshipNode, RelationshipNode>, d) => {
                d.fx = event.x;
                d.fy = event.y;
            })
            .on("end", (event: d3.D3DragEvent<SVGCircleElement, RelationshipNode, RelationshipNode>, d) => {
                if (!event.active) simulation.alphaTarget(0);
                d.fx = null;
                d.fy = null;
            })
        );

    // Labels
    const label = g.append("g")
        .attr("class", "labels")
        .selectAll<SVGTextElement, RelationshipNode>("text")
        .data(simulationNodes)
        .join("text")
        .attr("dy", d => getRadius(d) + 12)
        .attr("text-anchor", "middle")
        .text(d => d.id)
        .attr("font-family", "sans-serif")
        .attr("font-size", "10px")
        .attr("fill", "#d1d5db")
        .style("pointer-events", "none")
        .style("text-shadow", "-1px -1px 0 #111827, 1px -1px 0 #111827, -1px 1px 0 #111827, 1px 1px 0 #111827");

    // Interactions
    node.on("mouseover", (_, d) => {
        if (!selectedNodeIdRef.current) {
            node.attr("opacity", n => n.id === d.id || isConnected(n, d) ? 1 : 0.2);
            link.attr("opacity", l => (l.source as unknown as RelationshipNode).id === d.id || (l.target as unknown as RelationshipNode).id === d.id ? 1 : 0.1);
            label.attr("opacity", n => n.id === d.id || isConnected(n, d) ? 1 : 0.2);
        }
    });

    node.on("mouseout", () => {
        if (!selectedNodeIdRef.current) {
            node.attr("opacity", 1);
            link.attr("opacity", 0.6);
            label.attr("opacity", 1);
        }
    });

    node.on("click", (event: PointerEvent, d) => {
        event.stopPropagation();
        selectNode(d.id);
    });

    svg.on("click", () => {
        selectNode(null);
    });

    simulation.on("tick", () => {
        link
            .attr("x1", d => (d.source as unknown as RelationshipNode).x!)
            .attr("y1", d => (d.source as unknown as RelationshipNode).y!)
            .attr("x2", d => (d.target as unknown as RelationshipNode).x!)
            .attr("y2", d => (d.target as unknown as RelationshipNode).y!);

        node
            .attr("cx", d => d.x!)
            .attr("cy", d => d.y!);

        label
            .attr("x", d => d.x!)
            .attr("y", d => d.y!);
    });

    // Handle Resize
    const resizeObserver = new ResizeObserver(() => {
        if (!containerRef.current) return;
        const w = containerRef.current.clientWidth;
        const h = containerRef.current.clientHeight;
        svg.attr("width", w).attr("height", h);
        simulation.force("center", d3.forceCenter(w / 2, h / 2));
        simulation.alpha(0.3).restart();
    });

    resizeObserver.observe(containerRef.current);

    return () => {
        simulation.stop();
        resizeObserver.disconnect();
    };
  }, [nodes, links, selectNode]); // Re-run when data changes

  // Separate effect for selection highlighting to avoid re-running simulation
  useEffect(() => {
     if (!svgRef.current) return;
     const svg = d3.select(svgRef.current);
     // Note: Bound data is simulationNodes/simulationLinks (cloned), not store nodes/links
     const node = svg.selectAll<SVGCircleElement, RelationshipNode>(".nodes circle");
     const link = svg.selectAll<SVGLineElement, RelationshipLink>(".links line");
     const label = svg.selectAll<SVGTextElement, RelationshipNode>(".labels text");

     if (selectedNodeId) {
         // Pre-calculate connected nodes for O(E + N) highlighting instead of O(N * E)
         const connectedNodeIds = new Set<string>();
         connectedNodeIds.add(selectedNodeId);

         links.forEach(l => {
             const s = typeof l.source === 'object' ? l.source.id : l.source;
             const t = typeof l.target === 'object' ? l.target.id : l.target;
             if (s === selectedNodeId) connectedNodeIds.add(t);
             if (t === selectedNodeId) connectedNodeIds.add(s);
         });

         node.attr("opacity", n => connectedNodeIds.has(n.id) ? 1 : 0.2);

         link.attr("opacity", l => {
             // 'l' here is simulationLink, so source/target are objects (from forceLink)
             // D3 force simulation replaces source/target string IDs with actual Node objects
             // We can safely cast source/target to RelationshipNode because simulation has run
             const s = l.source as unknown as RelationshipNode;
             const t = l.target as unknown as RelationshipNode;
             return s.id === selectedNodeId || t.id === selectedNodeId ? 1 : 0.1;
         });

         label.attr("opacity", n => connectedNodeIds.has(n.id) ? 1 : 0.2);
     } else {
         node.attr("opacity", 1);
         link.attr("opacity", 0.6);
         label.attr("opacity", 1);
     }

  }, [selectedNodeId, nodes, links]);

  return (
    <div ref={containerRef} className="w-full h-full relative bg-gray-900 overflow-hidden">
        <svg ref={svgRef} className="w-full h-full cursor-move block"></svg>
    </div>
  );
}
