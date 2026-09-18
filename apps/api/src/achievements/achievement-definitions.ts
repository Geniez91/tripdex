export const achievementCategories = [
  'JOURNAL',
  'EXPLORATION',
  'CONTINENTS',
  'REVISITS',
  'TRAVEL_TIME',
  'COMMUNITY',
] as const;

export type TAchievementCategory = (typeof achievementCategories)[number];

export type TAchievementMetric =
  | 'TRIP_COUNT'
  | 'VISITED_COUNTRY_COUNT'
  | 'EXPLORED_CONTINENT_COUNT'
  | 'TOTAL_REVISITS'
  | 'MAX_TRIPS_IN_SAME_COUNTRY'
  | 'TOTAL_TRAVEL_DAYS'
  | 'COMMUNITY_VOTE_COUNT'
  | 'COMMUNITY_WIN_COUNT'
  | 'CONTINENT_VISITED';

export interface IAchievementDefinition {
  code: string;
  name: string;
  description: string;
  category: TAchievementCategory;
  metric: TAchievementMetric;
  target: number;
  continentCode?: string;
}

export const achievementDefinitions: readonly IAchievementDefinition[] = [
  { code: 'PREMIER_VOYAGE', name: 'Premier voyage', description: 'Logger ton premier voyage.', category: 'JOURNAL', metric: 'TRIP_COUNT', target: 1 },
  { code: 'PREMIER_PAS', name: 'Premier pas', description: 'Explorer ton premier pays.', category: 'EXPLORATION', metric: 'VISITED_COUNTRY_COUNT', target: 1 },
  { code: 'GLOBE_TROTTER', name: 'Globe Trotter', description: 'Explorer 10 pays.', category: 'EXPLORATION', metric: 'VISITED_COUNTRY_COUNT', target: 10 },
  { code: 'GRAND_EXPLORATEUR', name: 'Grand explorateur', description: 'Explorer 25 pays.', category: 'EXPLORATION', metric: 'VISITED_COUNTRY_COUNT', target: 25 },
  { code: 'PREMIERS_PAS_EUROPE', name: 'Premiers pas en Europe', description: 'Explorer ton premier pays en Europe.', category: 'CONTINENTS', metric: 'CONTINENT_VISITED', continentCode: 'EU', target: 1 },
  { code: 'PREMIERS_PAS_AFRIQUE', name: 'Premiers pas en Afrique', description: 'Explorer ton premier pays en Afrique.', category: 'CONTINENTS', metric: 'CONTINENT_VISITED', continentCode: 'AF', target: 1 },
  { code: 'PREMIERS_PAS_ASIE', name: 'Premiers pas en Asie', description: 'Explorer ton premier pays en Asie.', category: 'CONTINENTS', metric: 'CONTINENT_VISITED', continentCode: 'AS', target: 1 },
  { code: 'PREMIERS_PAS_AMERIQUE_NORD', name: 'Premiers pas en Amérique du Nord', description: 'Explorer ton premier pays en Amérique du Nord.', category: 'CONTINENTS', metric: 'CONTINENT_VISITED', continentCode: 'NA', target: 1 },
  { code: 'PREMIERS_PAS_AMERIQUE_SUD', name: 'Premiers pas en Amérique du Sud', description: 'Explorer ton premier pays en Amérique du Sud.', category: 'CONTINENTS', metric: 'CONTINENT_VISITED', continentCode: 'SA', target: 1 },
  { code: 'PREMIERS_PAS_OCEANIE', name: 'Premiers pas en Océanie', description: 'Explorer ton premier pays en Océanie.', category: 'CONTINENTS', metric: 'CONTINENT_VISITED', continentCode: 'OC', target: 1 },
  { code: 'PREMIERS_PAS_ANTARCTIQUE', name: 'Premiers pas en Antarctique', description: 'Explorer ton premier pays en Antarctique.', category: 'CONTINENTS', metric: 'CONTINENT_VISITED', continentCode: 'AN', target: 1 },
  { code: 'NOUVEAU_CONTINENT', name: 'Nouveau continent', description: 'Explorer 2 continents.', category: 'CONTINENTS', metric: 'EXPLORED_CONTINENT_COUNT', target: 2 },
  { code: 'TROIS_HORIZONS', name: 'Trois horizons', description: 'Explorer 3 continents.', category: 'CONTINENTS', metric: 'EXPLORED_CONTINENT_COUNT', target: 3 },
  { code: 'DEJA_VU', name: 'Déjà-vu', description: 'Retourner dans un pays déjà exploré.', category: 'REVISITS', metric: 'TOTAL_REVISITS', target: 1 },
  { code: 'CANT_STAY_AWAY', name: "Can't Stay Away", description: 'Voyager 3 fois dans le même pays.', category: 'REVISITS', metric: 'MAX_TRIPS_IN_SAME_COUNTRY', target: 3 },
  { code: 'TRENTE_JOURS_AILLEURS', name: '30 jours ailleurs', description: 'Cumuler 30 jours de voyage.', category: 'TRAVEL_TIME', metric: 'TOTAL_TRAVEL_DAYS', target: 30 },
  { code: 'CENT_JOURS_SUR_LA_ROUTE', name: '100 jours sur la route', description: 'Cumuler 100 jours de voyage.', category: 'TRAVEL_TIME', metric: 'TOTAL_TRAVEL_DAYS', target: 100 },
  { code: 'LA_VOIX_DU_VOYAGEUR', name: 'La voix du voyageur', description: 'Participer à un vote du Souvenir de la semaine.', category: 'COMMUNITY', metric: 'COMMUNITY_VOTE_COUNT', target: 1 },
  { code: 'PHOTOGRAPHE_TRIPDEX', name: 'Photographe TripDex', description: 'Gagner un Souvenir de la semaine.', category: 'COMMUNITY', metric: 'COMMUNITY_WIN_COUNT', target: 1 },
];
