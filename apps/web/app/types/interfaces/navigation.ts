export interface NavigationItem {
  id: "explorer" | "journal" | "map" | "profile";
  label: string;
  to: string;
  icon: string;
}

export type NavigationId = NavigationItem["id"];
