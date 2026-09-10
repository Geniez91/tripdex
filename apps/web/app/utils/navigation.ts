import type {
  NavigationItem,
  NavigationId,
} from "~/types/interfaces/navigation";

export type { NavigationId } from "~/types/interfaces/navigation";

export const navigationItems: readonly NavigationItem[] = [
  { id: "explorer", label: "Explorer", to: "/", icon: "mdi-earth" },
  {
    id: "journal",
    label: "Journal",
    to: "/journal",
    icon: "mdi-notebook-outline",
  },
  { id: "map", label: "Ma carte", to: "/profile/map", icon: "mdi-map-outline" },
  { id: "profile", label: "Profil", to: "/profile", icon: "mdi-passport" },
];

export function activeNavigation(path: string): NavigationId | null {
  const within = (base: string) => path === base || path.startsWith(`${base}/`);
  if (path === "/") return "explorer";
  if (within("/journal") || within("/trips")) return "journal";
  if (within("/profile/map")) return "map";
  if (within("/profile")) return "profile";
  return null;
}
