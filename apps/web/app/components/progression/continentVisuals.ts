interface ContinentVisual {
  name: string;
  asset: string;
  color: string;
  track: string;
}

// Presentation only. SVG frontend copies use the same fill as color.
// Counts and completion always come from the API.
export const continentVisuals: Readonly<Record<string, ContinentVisual>> = {
  AF: {
    name: "Afrique",
    asset: "/continents/afrique.svg",
    color: "#C5813D",
    track: "#F5E9DC",
  },
  AS: {
    name: "Asie",
    asset: "/continents/asie.svg",
    color: "#C87868",
    track: "#F6E5DE",
  },
  EU: {
    name: "Europe",
    asset: "/continents/europe.svg",
    color: "#397F83",
    track: "#DFECEC",
  },
  NA: {
    name: "Amérique du Nord",
    asset: "/continents/amerique_du_nord.svg",
    color: "#8B70A8",
    track: "#ECE6F2",
  },
  SA: {
    name: "Amérique du Sud",
    asset: "/continents/amerique_du_sud.svg",
    color: "#96705A",
    track: "#EEE5DF",
  },
  OC: {
    name: "Océanie",
    asset: "/continents/oceanie.svg",
    color: "#548DB7",
    track: "#E2EDF5",
  },
  AN: {
    name: "Antarctique",
    asset: "/continents/antarctique.jpg",
    color: "#57595B",
    track: "#E9EAEB",
  },
};
