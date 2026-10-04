import { useEffect, useState } from 'react';

// Minimal hash router: #/disease/DIS_NGLY1, #/ask?q=..., #/explore/graph. Hash URLs need no server
// rewrites, so every page can be reloaded, bookmarked and shared on any static host.
export interface Route {
  parts: string[];
  query: URLSearchParams;
}

function parse(): Route {
  const raw = window.location.hash.replace(/^#\/?/, '');
  const [path, qs = ''] = raw.split('?');
  return { parts: path.split('/').filter(Boolean).map(decodeURIComponent), query: new URLSearchParams(qs) };
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(parse);
  useEffect(() => {
    const onChange = () => {
      setRoute(parse());
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return route;
}

export function href(...parts: string[]): string {
  return '#/' + parts.map(encodeURIComponent).join('/');
}

export function navigate(to: string): void {
  window.location.hash = to.replace(/^#/, '');
}

// Pages for a node, by type; types without their own page fall back to the graph view.
export function nodeHref(type: string, id: string): string {
  return ['disease', 'gene', 'symptom', 'drug'].includes(type) ? href(type, id) : href('explore', 'graph');
}
