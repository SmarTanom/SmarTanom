// Reusable SVG Icon Components for Dashboard (JSX Version)
import React from 'react';

const make = (PathComp) => ({ size = 24, color = 'currentColor', strokeWidth = 1.8, ...rest }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    {...rest}
  >
    <PathComp />
  </svg>
);

const LeafPath = () => (
  <>
    <path d="M3 21c3-9 9-15 18-18-3 9-9 15-18 18Z" />
    <path d="M3 21c6-6 12-10 18-12" />
  </>
);
const AlertPath = () => (
  <>
    <path d="M12 9v4" />
    <path d="M12 17h.01" />
    <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
  </>
);
const WifiPath = () => (
  <>
    <path d="M5 12.55a11 11 0 0 1 14 0" />
    <path d="M8.5 16a6 6 0 0 1 7 0" />
    <path d="M12 20h.01" />
  </>
);
const SyncPath = () => (
  <>
    <path d="M21 2v6h-6" />
    <path d="M3 22v-6h6" />
    <path d="M3 16a9 9 0 0 0 15 5.74L21 22" />
    <path d="M21 8a9 9 0 0 0-15-5.74L3 2" />
  </>
);
const DropletPath = () => (
  <>
    <path d="M12 2.69 7.05 8.64a6.5 6.5 0 1 0 9.9 0Z" />
  </>
);
const PHPath = () => (
  <>
    <path d="M4 4v16" />
    <path d="M4 12h6" />
    <path d="M10 4v16" />
    <path d="M14 16V8h4a2 2 0 0 1 0 4h-4" />
    <path d="M18 16v-8" />
  </>
);
const ECPath = () => (
  <>
    <circle cx="12" cy="12" r="4" />
    <path d="M4 12h4" />
    <path d="M16 12h4" />
  </>
);
const TDSPath = () => (
  <>
    <path d="M6 4h4a2 2 0 0 1 0 4H8a2 2 0 0 1 0 4h4M14 4h6M17 4v16M14 20h6M14 12h6" />
  </>
);
const WaterLevelPath = () => (
  <>
    <path d="M12 2 6 12a6 6 0 1 0 12 0Z" />
  </>
);
const TurbidityPath = () => (
  <>
    <path d="M3 12h18" />
    <path d="M12 3v18" />
    <circle cx="12" cy="12" r="9" />
  </>
);
const TempPath = () => (
  <>
    <path d="M14 14.76V5a2 2 0 0 0-4 0v9.76a4 4 0 1 0 4 0Z" />
  </>
);
const HumidityPath = () => (
  <>
    <path d="M12 2.5C12 2.5 6 9 6 13a6 6 0 1 0 12 0c0-4-6-10.5-6-10.5Z" />
  </>
);
const LightPath = () => (
  <>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l1.41-1.41M16.24 7.76l1.41-1.41" />
  </>
);
// Newly re-added / extended icon set for dashboard UI elements
const SettingsPath = () => (
  <>
    <circle cx="12" cy="12" r="3.5" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06c.46.46 1.12.61 1.82.33H9c.63-.2 1.2-.62 1.51-1.23V6a2 2 0 1 1 4 0v.09c.31.61.88 1.03 1.51 1.23h.09c.7.28 1.36.13 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06c-.46.46-.61 1.19-.33 1.82v.09Z" />
  </>
);
const ChevronRightPath = () => (
  <>
    <path d="m9 6 6 6-6 6" />
  </>
);
const ArrowUpPath = () => (
  <>
    <path d="m5 11 7-7 7 7" />
    <path d="M12 4v16" />
  </>
);
const CloudPath = () => (
  <>
    <path d="M17.5 19H9a5 5 0 1 1 3.94-8.06A4.5 4.5 0 1 1 17.5 19Z" />
  </>
);
const UsersPath = () => (
  <>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </>
);
const UserPath = () => (
  <>
    <path d="M3 21a9 9 0 1 1 18 0" />
    <circle cx="12" cy="7" r="4" />
  </>
);

export const IconLeaf = make(LeafPath);
export const IconAlert = make(AlertPath);
export const IconWifi = make(WifiPath);
export const IconSync = make(SyncPath);
export const IconDroplet = make(DropletPath);
export const IconPH = make(PHPath);
export const IconEC = make(ECPath);
export const IconTDS = make(TDSPath);
export const IconWaterLevel = make(WaterLevelPath);
export const IconTurbidity = make(TurbidityPath);
export const IconTemp = make(TempPath);
export const IconHumidity = make(HumidityPath);
export const IconLight = make(LightPath);
export const IconSettings = make(SettingsPath);
export const IconChevronRight = make(ChevronRightPath);
export const IconArrowUp = make(ArrowUpPath);
export const IconCloud = make(CloudPath);
export const IconUsers = make(UsersPath);
export const IconUser = make(UserPath);

export const Icons = {
  leaf: IconLeaf,
  alert: IconAlert,
  wifi: IconWifi,
  sync: IconSync,
  droplet: IconDroplet,
  ph: IconPH,
  ec: IconEC,
  tds: IconTDS,
  water: IconWaterLevel,
  turbidity: IconTurbidity,
  temp: IconTemp,
  humidity: IconHumidity,
  light: IconLight,
  settings: IconSettings,
  chevronRight: IconChevronRight,
  arrowUp: IconArrowUp,
  cloud: IconCloud,
  users: IconUsers,
  user: IconUser,
};
