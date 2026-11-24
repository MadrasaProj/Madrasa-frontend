import { useEffect, useRef, type ReactNode } from 'react';

type SvgAttrMap = {
  id: string;
  attr: string;
  value: string;
};

type SvgPosterProps = {
  svg: ReactNode;
  maps?: SvgAttrMap | SvgAttrMap[];
  defaultMaps?: SvgAttrMap[];
};

export function SvgPoster({ svg, maps, defaultMaps = [] }: SvgPosterProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;

    const appliedUpdates = new Map<string, { attr: string; value: string }>();

    for (const item of defaultMaps) {
      appliedUpdates.set(`${item.id}:${item.attr}`, {
        attr: item.attr,
        value: item.value,
      });
    }

    const activeMaps = Array.isArray(maps) ? maps : maps ? [maps] : [];
    for (const item of activeMaps) {
      appliedUpdates.set(`${item.id}:${item.attr}`, {
        attr: item.attr,
        value: item.value,
      });
    }

    for (const [key, { attr, value }] of appliedUpdates.entries()) {
      const id = key.slice(0, key.indexOf(':'));
      const target = root.querySelector<SVGElement>(`#${CSS.escape(id)}`);
      if (target) {
        target.setAttribute(attr, value);
      }
    }
  }, [svg, maps, defaultMaps]);

  return <div ref={containerRef}>{svg}</div>;
}