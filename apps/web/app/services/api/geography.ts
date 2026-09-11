import type { FeatureCollection, Geometry } from "geojson";
import type { MapProperties } from "~/types/interfaces/map";

export function getWorldGeometry(
  signal?: AbortSignal,
): Promise<FeatureCollection<Geometry, MapProperties>> {
  return $fetch<FeatureCollection<Geometry, MapProperties>>(
    "/maps/world.json",
    { signal },
  );
}
