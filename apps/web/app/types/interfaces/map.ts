export interface MapProperties {
  iso3: string | null;
  name: string;
  label: [number, number];
}

export interface MapShape {
  id: string | number | undefined;
  properties: MapProperties;
  path: string;
  marker: [number, number] | null;
}

export interface MapCountryAppearance {
  fill: string;
  description: string;
}
