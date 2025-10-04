// Additional Dashboard Icons
import React from 'react';

const make = (PathComp) => ({ size = 24, color = 'currentColor', strokeWidth = 2, ...rest }) => (
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

// Settings/Gear Icon
const SettingsPath = () => (
  <>
    <circle cx="12" cy="12" r="3" />
    <path d="M12 1v6m0 6v10M5.64 5.64l4.24 4.24m4.24 4.24l4.24 4.24M1 12h6m6 0h10M5.64 18.36l4.24-4.24m4.24-4.24l4.24-4.24" />
  </>
);

// Users/Team Icon
const UsersPath = () => (
  <>
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </>
);

// User Profile Icon
const UserPath = () => (
  <>
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </>
);

// Chevron Right
const ChevronRightPath = () => (
  <path d="M9 18l6-6-6-6" />
);

// Chevron Down  
const ChevronDownPath = () => (
  <path d="M6 9l6 6 6-6" />
);

// Check/Success Icon
const CheckPath = () => (
  <>
    <path d="M20 6L9 17l-5-5" />
  </>
);

// Wifi with check (connectivity)
const WifiCheckPath = () => (
  <>
    <path d="M5 12.55a11 11 0 0 1 14 0" />
    <path d="M8.5 16a6 6 0 0 1 7 0" />
    <circle cx="12" cy="20" r="1" fill="currentColor" />
  </>
);

// Arrow Up (trend up)
const ArrowUpPath = () => (
  <path d="M12 19V5m0 0l-7 7m7-7l7 7" />
);

// Cloud/CO2 Icon
const CloudPath = () => (
  <path d="M3 15h18M3 12h18M3 9h18" />
);

export const IconSettings = make(SettingsPath);
export const IconUsers = make(UsersPath);
export const IconUser = make(UserPath);
export const IconChevronRight = make(ChevronRightPath);
export const IconChevronDown = make(ChevronDownPath);
export const IconCheck = make(CheckPath);
export const IconWifiCheck = make(WifiCheckPath);
export const IconArrowUp = make(ArrowUpPath);
export const IconCloud = make(CloudPath);
