export interface MapZoomTransform {
  x: number;
  y: number;
  k: number;
}

export interface MapPoint {
  x: number;
  y: number;
}

export const MAP_VIEWBOX = { width: 960, height: 506 } as const;

export function clampMapZoom(scale: number): number {
  return Math.min(24, Math.max(1, scale));
}

export function zoomAroundPoint(
  transform: MapZoomTransform,
  scale: number,
  point: MapPoint,
): MapZoomTransform {
  const k = clampMapZoom(scale);
  const ratio = k / transform.k;
  return {
    k,
    x: point.x - (point.x - transform.x) * ratio,
    y: point.y - (point.y - transform.y) * ratio,
  };
}

export interface MapViewport { width: number; height: number }
export type MapBounds = [[number, number], [number, number]];

export function worldTransform(): MapZoomTransform {
  return { x: 0, y: 0, k: 1 };
}

export function fitMapBounds(bounds: MapBounds, viewport: MapViewport, padding = 0.1): MapZoomTransform {
  const [[left, top], [right, bottom]] = bounds;
  if (![left, top, right, bottom].every(Number.isFinite)) return worldTransform();
  const k = clampMapZoom(Math.min(
    viewport.width * (1 - 2 * padding) / Math.max(right - left, 1),
    viewport.height * (1 - 2 * padding) / Math.max(bottom - top, 1),
  ));
  return { k, x: viewport.width / 2 - k * (left + right) / 2, y: viewport.height / 2 - k * (top + bottom) / 2 };
}

export function resizeMapTransform(transform: MapZoomTransform, previous: MapViewport, next: MapViewport): MapZoomTransform {
  // The responsive viewport retains its aspect ratio. Scale translations directly
  // so the world origin stays exactly zero, including during an animated resize.
  return { k: transform.k, x: transform.x * (next.width / previous.width),
    y: transform.y * (next.height / previous.height) };
}
