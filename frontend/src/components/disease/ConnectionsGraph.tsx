import React, { useEffect, useMemo, useRef, useState } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { MariasJourney } from '../../types';
import { href, navigate } from '../../router';

type Mechanism = MariasJourney['step2_mechanism'];

interface GNode {
  id: string;
  label: string;
  kind: 'focus' | 'pathway' | 'mechanism' | 'phenotype' | 'counter';
  curated?: boolean;
  tip: string;
  side?: 'left' | 'right' | 'center' | 'above';
  x?: number;
  y?: number;
  fx?: number;
  fy?: number;
}
interface GLink {
  source: string;
  target: string;
  kind: 'pathway' | 'phenotype' | 'counter';
}

const MAX_PATHWAYS = 5;
const COLORS = {
  focus: '#047857', // emerald-700
  pathway: '#0e7490', // cyan-700
  mechanism: '#334155', // slate-700
  phenotype: '#94a3b8', // slate-400
  counter: '#b45309', // amber-700
  link: '#cbd5e1', // slate-300
};

const curatedId = (id: string) => !id.startsWith('DIS_OMIM_');
const short = (s: string, n = 28) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);
const labelText = (n: GNode) => short(n.label, n.kind === 'focus' ? 34 : n.kind === 'pathway' ? 30 : 30);

// Builds the neighbourhood from data the disease page already has: the disease, the pathways it
// shares (most widely shared first), mechanism neighbours through those pathways, similar-looking
// diseases (dashed, straight to the disease) and counterexamples (amber).
function buildGraph(focusId: string, focusLabel: string, m: Mechanism): { nodes: GNode[]; links: GLink[] } {
  const nodes = new Map<string, GNode>();
  const links: GLink[] = [];
  nodes.set(focusId, { id: focusId, label: focusLabel, kind: 'focus', curated: true, tip: focusLabel });

  const mech = m.related_diseases.filter((r) => r.basis === 'mechanism');
  const counts = new Map<string, { label: string; n: number }>();
  mech.forEach((r) =>
    r.shared_pathway_ids.forEach((pid, i) => {
      const c = counts.get(pid) || { label: r.shared_pathways[i] || pid, n: 0 };
      c.n += 1;
      counts.set(pid, c);
    }),
  );
  const shown = [...counts.entries()].sort((a, b) => b[1].n - a[1].n).slice(0, MAX_PATHWAYS).map(([pid]) => pid);
  shown.forEach((pid) => {
    const c = counts.get(pid)!;
    nodes.set(`pw:${pid}`, { id: `pw:${pid}`, label: c.label, kind: 'pathway', tip: `${c.label} · shared with ${c.n} disease${c.n > 1 ? 's' : ''}` });
    links.push({ source: focusId, target: `pw:${pid}`, kind: 'pathway' });
  });

  mech.forEach((r) => {
    nodes.set(r.disease_id, {
      id: r.disease_id,
      label: r.label,
      kind: 'mechanism',
      curated: curatedId(r.disease_id),
      tip: `${r.label} · via ${r.shared_pathways.slice(0, 2).join('; ')}${r.phenotype_similarity > 0 ? ` · phenotype similarity ${r.phenotype_similarity.toFixed(2)}` : ''}`,
    });
    const via = r.shared_pathway_ids.filter((pid) => shown.includes(pid));
    if (via.length) via.forEach((pid) => links.push({ source: `pw:${pid}`, target: r.disease_id, kind: 'pathway' }));
    else links.push({ source: focusId, target: r.disease_id, kind: 'pathway' });
  });

  m.related_diseases
    .filter((r) => r.basis === 'phenotype')
    .forEach((r) => {
      nodes.set(r.disease_id, {
        id: r.disease_id,
        label: r.label,
        kind: 'phenotype',
        curated: curatedId(r.disease_id),
        tip: `${r.label} · similar symptoms only (${r.shared_phenotypes.slice(0, 2).map((p) => p.label).join(', ')}) · similarity ${r.phenotype_similarity.toFixed(2)}`,
      });
      links.push({ source: focusId, target: r.disease_id, kind: 'phenotype' });
    });

  m.counterexamples.forEach((c) => {
    const existing = nodes.get(c.disease_id);
    nodes.set(c.disease_id, {
      id: c.disease_id,
      label: c.label,
      kind: 'counter',
      curated: curatedId(c.disease_id),
      tip: `${c.label} · same pathway, opposite effect (${c.their_direction.replace(/_/g, ' ')})`,
      ...(existing ? { x: existing.x, y: existing.y } : {}),
    });
    links.push({ source: focusId, target: c.disease_id, kind: 'counter' });
  });

  layout(nodes, links, shown);
  return { nodes: [...nodes.values()], links };
}

// Fixed radial layout: mechanism side on the left (pathways on an inner arc, the diseases they link
// on an outer arc, ordered by pathway so lines rarely cross), similar-looking diseases on the right,
// counterexamples not already placed at the bottom.
function layout(nodes: Map<string, GNode>, links: GLink[], shown: string[]) {
  const place = (n: GNode, r: number, deg: number, side: GNode['side']) => {
    const a = (deg * Math.PI) / 180;
    n.fx = n.x = 1.7 * r * Math.cos(a); // wider than tall, to fit the page column
    n.fy = n.y = r * Math.sin(a);
    n.side = side;
  };
  const arc = (count: number, from: number, to: number) =>
    Array.from({ length: count }, (_, i) => (count === 1 ? (from + to) / 2 : from + ((to - from) * i) / (count - 1)));

  const all = [...nodes.values()];
  const focus = all.find((n) => n.kind === 'focus')!;
  place(focus, 0, 0, 'right');

  const pathways = shown.map((pid) => nodes.get(`pw:${pid}`)!);
  arc(pathways.length, 150, 210).forEach((deg, i) => place(pathways[i], 90, deg, 'above'));

  const firstPathway = (id: string) => {
    const l = links.find((k) => k.target === id && k.source.startsWith('pw:'));
    return l ? shown.indexOf(l.source.slice(3)) : shown.length;
  };
  const mech = all.filter((n) => n.kind === 'mechanism' || (n.kind === 'counter' && links.some((k) => k.target === n.id && k.kind === 'pathway')));
  mech.sort((a, b) => firstPathway(a.id) - firstPathway(b.id));
  arc(mech.length, 118, 242).forEach((deg, i) => place(mech[i], 215, deg, 'left'));

  const pheno = all.filter((n) => n.kind === 'phenotype');
  arc(pheno.length, -55, 55).forEach((deg, i) => place(pheno[i], 150, deg, 'right'));

  const counters = all.filter((n) => n.kind === 'counter' && n.fx === undefined);
  arc(counters.length, 75, 105).forEach((deg, i) => place(counters[i], 150, deg, 'right'));
}

export const ConnectionsGraph: React.FC<{ focusId: string; focusLabel: string; mechanism: Mechanism }> = ({ focusId, focusLabel, mechanism }) => {
  const wrapRef = useRef<HTMLDivElement>(null);
  const fgRef = useRef<any>(null);
  const [width, setWidth] = useState(0);
  const [hover, setHover] = useState<GNode | null>(null);
  const data = useMemo(() => buildGraph(focusId, focusLabel, mechanism), [focusId, focusLabel, mechanism]);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    setWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  const height = 360;
  const LABEL_PX = 10; // label font size on screen
  // Fit the nodes and their labels: labels are drawn at a constant screen size, so their extent in
  // graph units depends on the zoom; one refinement pass is enough.
  const fit = () => {
    const fg = fgRef.current;
    if (!fg || !width) return;
    const extent = (k: number) => {
      let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
      data.nodes.forEach((n) => {
        const w = (labelText(n).length * LABEL_PX * 0.55 + 12) / k;
        const x = n.x ?? 0, y = n.y ?? 0;
        x0 = Math.min(x0, n.side === 'left' ? x - w : x - 10 / k);
        x1 = Math.max(x1, n.side === 'right' ? x + w : x + 10 / k);
        y0 = Math.min(y0, y - 16 / k);
        y1 = Math.max(y1, y + 16 / k);
      });
      return { x0, x1, y0, y1 };
    };
    let k = 1;
    for (let i = 0; i < 3; i++) {
      const e = extent(k);
      k = Math.min((width - 24) / (e.x1 - e.x0), (height - 24) / (e.y1 - e.y0));
    }
    const e = extent(k);
    fg.zoom(k, 0);
    fg.centerAt((e.x0 + e.x1) / 2, (e.y0 + e.y1) / 2, 0);
  };

  useEffect(() => {
    const t = setTimeout(fit, 50);
    return () => clearTimeout(t);
  }, [data, width]);

  if (data.nodes.length < 2) return null;

  return (
    // Hidden on phones: labels need room, and the list below carries the same information
    <div className="mb-5 hidden sm:block">
      <div ref={wrapRef} className="relative border border-slate-200 rounded-xl overflow-hidden bg-slate-50/50" style={{ height }}>
        {width > 0 && (
          <ForceGraph2D
            ref={fgRef}
            width={width}
            height={height}
            graphData={data as any}
            nodeId="id"
            cooldownTicks={1}
            onEngineStop={fit}
            enablePanInteraction={false}
            enableNodeDrag={false}
            enableZoomInteraction={false}
            nodeLabel={() => ''}
            onNodeHover={(n: any) => setHover(n || null)}
            onNodeClick={(n: any) => {
              if (n.kind !== 'pathway' && n.id !== focusId) navigate(href('disease', n.id));
            }}
            linkColor={(l: any) => (l.kind === 'counter' ? COLORS.counter : COLORS.link)}
            linkWidth={(l: any) => (l.kind === 'counter' ? 2 : 1.2)}
            linkLineDash={(l: any) => (l.kind === 'phenotype' ? [3, 3] : null)}
            nodePointerAreaPaint={(n: any, color, ctx) => {
              ctx.fillStyle = color;
              ctx.beginPath();
              ctx.arc(n.x, n.y, 9, 0, 2 * Math.PI);
              ctx.fill();
            }}
            nodeCanvasObject={(n: any, ctx, scale) => {
              const r = n.kind === 'focus' ? 8 : n.kind === 'pathway' ? 5.5 : 5;
              ctx.fillStyle = COLORS[n.kind as keyof typeof COLORS];
              ctx.beginPath();
              if (n.kind === 'pathway') ctx.rect(n.x - r, n.y - r, r * 2, r * 2);
              else ctx.arc(n.x, n.y, r, 0, 2 * Math.PI);
              ctx.fill();
              ctx.strokeStyle = '#ffffff';
              ctx.lineWidth = 1.5 / scale;
              ctx.stroke();

              // Labels point away from the centre: left of left-side nodes, right of right-side ones
              const size = (n.kind === 'focus' ? 11.5 : 10) / scale;
              ctx.font = `${n.kind === 'focus' || n.curated ? '600 ' : ''}${size}px Inter, system-ui, sans-serif`;
              ctx.textBaseline = 'middle';
              const text = labelText(n);
              const w = ctx.measureText(text).width;
              let tx = n.x;
              let ty = n.y;
              if (n.side === 'left') {
                ctx.textAlign = 'right';
                tx = n.x - r - 3;
              } else if (n.side === 'right') {
                ctx.textAlign = 'left';
                tx = n.x + r + 3;
              } else if (n.side === 'above') {
                ctx.textAlign = 'center';
                ty = n.y - r - size / 2 - 3;
              } else {
                ctx.textAlign = 'center';
                ty = n.y + r + size / 2 + 3;
              }
              const left = ctx.textAlign === 'right' ? tx - w : ctx.textAlign === 'left' ? tx : tx - w / 2;
              ctx.fillStyle = 'rgba(248,250,252,0.9)';
              ctx.fillRect(left - 1.5, ty - size / 2 - 1, w + 3, size + 2);
              ctx.fillStyle =
                n.kind === 'pathway' ? COLORS.pathway : n.kind === 'counter' ? COLORS.counter : n.kind === 'phenotype' ? '#64748b' : '#0f172a';
              ctx.fillText(text, tx, ty);
            }}
          />
        )}
        {hover && (
          <div className="absolute left-3 right-3 bottom-3 text-xs text-slate-700 bg-white/95 border border-slate-200 rounded-lg px-3 py-2 pointer-events-none">
            {hover.tip}
            {hover.kind !== 'pathway' && hover.id !== focusId && <span className="text-slate-400"> · click to open</span>}
          </div>
        )}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: COLORS.pathway }} /> shared pathway</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: COLORS.mechanism }} /> linked by mechanism</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-0 w-4 border-t border-dashed border-slate-400" /> similar symptoms only</span>
        {mechanism.counterexamples.length > 0 && (
          <span className="inline-flex items-center gap-1.5"><span className="h-0 w-4 border-t-2" style={{ borderColor: COLORS.counter }} /> opposite effect</span>
        )}
        <a href={`${href('explore', 'graph')}?focus=${encodeURIComponent(focusId)}`} className="ml-auto text-emerald-800 hover:underline">
          Open in full graph
        </a>
      </div>
    </div>
  );
};
