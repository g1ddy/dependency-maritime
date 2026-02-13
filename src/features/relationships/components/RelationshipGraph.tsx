import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { useRelationshipStore } from '../store';
import type { RelationshipNode, RelationshipLink } from '../types';

export function RelationshipGraph() {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const { nodes, links, selectNode, selectedNodeId } = useRelationshipStore();

  useEffect(() => {
    if (!containerRef.current || !svgRef.current || nodes.length === 0) return;

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
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });

    svg.call(zoom);

    // Simulation
    const simulation = d3.forceSimulation<RelationshipNode>(nodes)
        .force("link", d3.forceLink<RelationshipNode, RelationshipLink>(links).id(d => d.id).distance(120))
        .force("charge", d3.forceManyBody().strength(-400))
        .force("center", d3.forceCenter(width / 2, height / 2))
        .force("collide", d3.forceCollide<RelationshipNode>().radius((d) => (d.degree ? 5 + Math.min(d.degree * 2, 25) : 5) + 5).iterations(2));

    // Color Scale
    const uniqueClusters = Array.from(new Set(nodes.map(d => d.cluster)));
    const color = d3.scaleOrdinal(d3.schemeCategory10).domain(uniqueClusters);

    // Helpers
    const getRadius = (d: RelationshipNode) => 5 + Math.min(d.degree * 2, 25);
    const isConnected = (a: RelationshipNode, b: RelationshipNode) => {
        return links.some(l => (l.source === a && l.target === b) || (l.source === b && l.target === a));
    }

    // Draw Links
    const link = g.append("g")
        .attr("class", "links")
        .selectAll("line")
        .data(links)
        .join("line")
        .attr("stroke", "#4b5563")
        .attr("stroke-opacity", 0.6)
        .attr("stroke-width", d => Math.max(1, Math.log10(d.relationshipWeight + 1) * 3));

    // Draw Nodes
    const node = g.append("g")
        .attr("class", "nodes")
        .selectAll("circle")
        .data(nodes)
        .join("circle")
        .attr("r", d => getRadius(d))
        .attr("fill", d => color(d.cluster))
        .attr("stroke", "#374151")
        .attr("stroke-width", 1.5)
        .call(d3.drag<SVGCircleElement, RelationshipNode>()
            .on("start", (event: d3.D3DragEvent<SVGCircleElement, RelationshipNode, RelationshipNode>, d) => {
                if (!event.active) simulation.alphaTarget(0.3).restart();
                d.fx = d.x;
                d.fy = d.y;
            })
            .on("drag", (event, d) => {
                d.fx = event.x;
                d.fy = event.y;
            })
            .on("end", (event, d) => {
                if (!event.active) simulation.alphaTarget(0);
                d.fx = null;
                d.fy = null;
            }) as any
        );

    // Labels
    const label = g.append("g")
        .attr("class", "labels")
        .selectAll("text")
        .data(nodes)
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
        if (!selectedNodeId) {
            node.attr("opacity", n => n === d || isConnected(n, d) ? 1 : 0.2);
            link.attr("opacity", l => (l.source as RelationshipNode) === d || (l.target as RelationshipNode) === d ? 1 : 0.1);
            label.attr("opacity", n => n === d || isConnected(n, d) ? 1 : 0.2);
        }
    });

    node.on("mouseout", () => {
        if (!selectedNodeId) {
            node.attr("opacity", 1);
            link.attr("opacity", 0.6);
            label.attr("opacity", 1);
        }
    });

    node.on("click", (event, d) => {
        event.stopPropagation();
        selectNode(d.id);
    });

    svg.on("click", () => {
        selectNode(null);
    });

    simulation.on("tick", () => {
        link
            .attr("x1", d => (d.source as RelationshipNode).x!)
            .attr("y1", d => (d.source as RelationshipNode).y!)
            .attr("x2", d => (d.target as RelationshipNode).x!)
            .attr("y2", d => (d.target as RelationshipNode).y!);

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
  }, [nodes, links, selectNode, selectedNodeId]); // Re-run when data changes

  // Separate effect for selection highlighting to avoid re-running simulation
  useEffect(() => {
     if (!svgRef.current) return;
     const svg = d3.select(svgRef.current);
     const node = svg.selectAll(".nodes circle");
     const link = svg.selectAll(".links line");
     const label = svg.selectAll(".labels text");

     if (selectedNodeId) {
         // Find node object
         const d = nodes.find(n => n.id === selectedNodeId);
         if (!d) return;

         const isConnected = (a: RelationshipNode, b: RelationshipNode) => {
            return links.some(l => (l.source === a && l.target === b) || (l.source === b && l.target === a));
         };

         node.attr("opacity", n => n === d || isConnected(n as RelationshipNode, d) ? 1 : 0.2);
         link.attr("opacity", l => {
             const linkData = l as RelationshipLink;
             return (linkData.source as RelationshipNode) === d || (linkData.target as RelationshipNode) === d ? 1 : 0.1;
         });
         label.attr("opacity", n => n === d || isConnected(n as RelationshipNode, d) ? 1 : 0.2);
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
