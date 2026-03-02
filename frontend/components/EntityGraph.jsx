import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

const TYPE_COLORS = {
  person: '#63b3ed',
  organization: '#b794f4',
  ip: '#fc8181',
  domain: '#f6ad55',
  location: '#68d391',
  transaction: '#f6e05e',
  device: '#76e4f7',
};

const RISK_COLORS = {
  CRITICAL: '#fc8181',
  HIGH: '#f6ad55',
  MEDIUM: '#f6e05e',
  LOW: '#68d391',
};

export default function EntityGraph({ data, onNodeSelect }) {
  const svgRef = useRef(null);
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState('all');
  const simulationRef = useRef(null);

  useEffect(() => {
    if (!data || !svgRef.current) return;

    const el = svgRef.current;
    const W = el.clientWidth || 800;
    const H = el.clientHeight || 500;

    d3.select(el).selectAll('*').remove();

    const svg = d3.select(el)
      .attr('width', W).attr('height', H);

    // Background
    svg.append('rect').attr('width', W).attr('height', H).attr('fill', 'transparent');

    // Defs — glow filter
    const defs = svg.append('defs');
    const glowFilter = defs.append('filter').attr('id', 'glow');
    glowFilter.append('feGaussianBlur').attr('stdDeviation', '3').attr('result', 'coloredBlur');
    const feMerge = glowFilter.append('feMerge');
    feMerge.append('feMergeNode').attr('in', 'coloredBlur');
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    // Arrow markers
    ['#63b3ed', '#fc8181', '#f6ad55'].forEach((color, i) => {
      defs.append('marker')
        .attr('id', `arrow-${i}`)
        .attr('viewBox', '0 -5 10 10')
        .attr('refX', 18).attr('refY', 0)
        .attr('markerWidth', 5).attr('markerHeight', 5)
        .attr('orient', 'auto')
        .append('path')
        .attr('d', 'M0,-5L10,0L0,5')
        .attr('fill', color)
        .attr('opacity', 0.6);
    });

    const filteredNodes = filter === 'all' ? data.nodes : data.nodes.filter(n => n.type === filter);
    const nodeIds = new Set(filteredNodes.map(n => n.id));
    const filteredLinks = data.links.filter(l => nodeIds.has(l.source?.id || l.source) && nodeIds.has(l.target?.id || l.target));

    const nodes = filteredNodes.map(d => ({ ...d }));
    const links = filteredLinks.map(d => ({ ...d }));

    // Force simulation
    const sim = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links).id(d => d.id).distance(80).strength(0.5))
      .force('charge', d3.forceManyBody().strength(-200))
      .force('center', d3.forceCenter(W / 2, H / 2))
      .force('collision', d3.forceCollide(30));
    simulationRef.current = sim;

    // Zoom
    const g = svg.append('g');
    svg.call(d3.zoom().scaleExtent([0.3, 3]).on('zoom', e => g.attr('transform', e.transform)));

    // Links
    const link = g.append('g').selectAll('line')
      .data(links).join('line')
      .attr('stroke', '#1a3a5c')
      .attr('stroke-width', d => d.strength * 2)
      .attr('stroke-opacity', 0.6)
      .attr('marker-end', 'url(#arrow-0)');

    // Link labels
    const linkLabel = g.append('g').selectAll('text')
      .data(links).join('text')
      .attr('font-size', '0.38rem')
      .attr('fill', '#4a5568')
      .attr('text-anchor', 'middle')
      .attr('font-family', 'JetBrains Mono, monospace')
      .text(d => d.type.replace(/_/g, ' '));

    // Node groups
    const node = g.append('g').selectAll('g')
      .data(nodes).join('g')
      .attr('cursor', 'pointer')
      .call(d3.drag()
        .on('start', (e, d) => { if (!e.active) sim.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
        .on('drag', (e, d) => { d.fx = e.x; d.fy = e.y; })
        .on('end', (e, d) => { if (!e.active) sim.alphaTarget(0); d.fx = null; d.fy = null; })
      )
      .on('click', (e, d) => {
        e.stopPropagation();
        setSelected(d);
        onNodeSelect?.(d);
      });

    // Node outer ring (risk color)
    node.append('circle')
      .attr('r', 18)
      .attr('fill', 'none')
      .attr('stroke', d => RISK_COLORS[d.risk] || '#63b3ed')
      .attr('stroke-width', 1)
      .attr('stroke-opacity', 0.5)
      .attr('filter', 'url(#glow)');

    // Node inner circle
    node.append('circle')
      .attr('r', 12)
      .attr('fill', d => TYPE_COLORS[d.type] + '22')
      .attr('stroke', d => TYPE_COLORS[d.type])
      .attr('stroke-width', 1.5);

    // Node icon/letter
    node.append('text')
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'central')
      .attr('font-size', '0.5rem')
      .attr('fill', d => TYPE_COLORS[d.type])
      .attr('font-family', 'JetBrains Mono, monospace')
      .text(d => {
        const icons = { person:'P', organization:'O', ip:'IP', domain:'D', location:'L', transaction:'TX', device:'DV' };
        return icons[d.type] || '?';
      });

    // Node label
    node.append('text')
      .attr('y', 26)
      .attr('text-anchor', 'middle')
      .attr('font-size', '0.5rem')
      .attr('fill', '#718096')
      .attr('font-family', 'JetBrains Mono, monospace')
      .text(d => d.label.length > 14 ? d.label.slice(0, 14) + '…' : d.label);

    // Pulse animation on critical nodes
    node.filter(d => d.risk === 'CRITICAL')
      .append('circle')
      .attr('r', 18)
      .attr('fill', 'none')
      .attr('stroke', '#fc8181')
      .attr('stroke-width', 1)
      .attr('opacity', 0.8)
      .each(function() {
        const el = d3.select(this);
        function pulse() {
          el.attr('r', 18).attr('opacity', 0.8)
            .transition().duration(1500)
            .attr('r', 28).attr('opacity', 0)
            .on('end', pulse);
        }
        pulse();
      });

    sim.on('tick', () => {
      link
        .attr('x1', d => d.source.x).attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x).attr('y2', d => d.target.y);
      linkLabel
        .attr('x', d => (d.source.x + d.target.x) / 2)
        .attr('y', d => (d.source.y + d.target.y) / 2);
      node.attr('transform', d => `translate(${d.x},${d.y})`);
    });

    return () => sim.stop();
  }, [data, filter]);

  const types = ['all', 'person', 'organization', 'ip', 'domain', 'location', 'transaction', 'device'];

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', display: 'flex', flexDirection: 'column' }}>
      {/* Filter bar */}
      <div style={{ display: 'flex', gap: 4, padding: '6px 10px', borderBottom: '1px solid rgba(99,179,237,0.12)', flexWrap: 'wrap', background: 'rgba(99,179,237,0.02)' }}>
        {types.map(t => (
          <button key={t} onClick={() => setFilter(t)} style={{
            padding: '2px 8px', fontSize: '0.5rem', letterSpacing: '0.1em',
            fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase',
            border: `1px solid ${filter === t ? (TYPE_COLORS[t] || '#63b3ed') : 'rgba(99,179,237,0.15)'}`,
            color: filter === t ? (TYPE_COLORS[t] || '#63b3ed') : '#718096',
            background: filter === t ? `${(TYPE_COLORS[t] || '#63b3ed')}15` : 'transparent',
            cursor: 'pointer', transition: 'all 0.15s'
          }}>{t}</button>
        ))}
      </div>

      <svg ref={svgRef} style={{ flex: 1, width: '100%', background: 'transparent' }} />

      {/* Legend */}
      <div style={{ position: 'absolute', bottom: 10, left: 10, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {Object.entries(RISK_COLORS).map(([r, c]) => (
          <div key={r} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.45rem', color: c, fontFamily: 'JetBrains Mono, monospace' }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: c }} />{r}
          </div>
        ))}
      </div>
    </div>
  );
}
