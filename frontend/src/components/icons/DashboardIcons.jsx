import React from 'react';

// Base SVG wrapper with common props
const Svg = ({ size = 24, color = '#000', strokeWidth = 2, children, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    {children}
  </svg>
);

// Settings/Gear Icon
export const IconSettings = ({ size = 24, color = '#333', ...props }) => (
  <Svg size={size} color={color} {...props}>
    <circle cx="12" cy="12" r="3" />
    <path d="M12 1v6m0 6v6M5.64 5.64l4.24 4.24m4.24 4.24l4.24 4.24M1 12h6m6 0h6M5.64 18.36l4.24-4.24m4.24-4.24l4.24-4.24" />
  </Svg>
);

// Team/Users Icon (multiple people)
export const IconUsers = ({ size = 24, color = '#333', ...props }) => (
  <Svg size={size} color={color} {...props}>
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </Svg>
);

// Single User Icon
export const IconUser = ({ size = 24, color = '#333', ...props }) => (
  <Svg size={size} color={color} {...props}>
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </Svg>
);

// Bell Icon for Alerts
export const IconBell = ({ size = 24, color = '#333', ...props }) => (
  <Svg size={size} color={color} {...props}>
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </Svg>
);

// Chevron Right Icon
export const IconChevronRight = ({ size = 24, color = '#333', ...props }) => (
  <Svg size={size} color={color} {...props}>
    <path d="M9 18l6-6-6-6" />
  </Svg>
);

// Arrow Up Icon (for trends)
export const IconArrowUp = ({ size = 24, color = '#16a34a', ...props }) => (
  <Svg size={size} color={color} strokeWidth={2.5} {...props}>
    <path d="M12 19V5m-7 7l7-7 7 7" />
  </Svg>
);

// Cloud Icon (for CO2)
export const IconCloud = ({ size = 24, color = '#333', ...props }) => (
  <Svg size={size} color={color} {...props}>
    <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />
  </Svg>
);

// Wifi with Check Icon (connectivity status)
export const IconWifiCheck = ({ size = 24, color = '#16a34a', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path
      d="M5 12.55a11 11 0 0 1 14.08 0"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M1.42 9a16 16 0 0 1 21.16 0"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M8.53 16.11a6 6 0 0 1 6.95 0"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle cx="12" cy="20" r="1" fill={color} />
    {/* Check mark */}
    <path
      d="M17 8l2 2 4-4"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

// Droplet Icon (for water/nutrients)
export const IconDroplet = ({ size = 24, color = '#333', ...props }) => (
  <Svg size={size} color={color} {...props}>
    <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
  </Svg>
);

// Activity/Chart Icon
export const IconActivity = ({ size = 24, color = '#333', ...props }) => (
  <Svg size={size} color={color} {...props}>
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
  </Svg>
);

// Alert Triangle Icon
export const IconAlertTriangle = ({ size = 24, color = '#dc2626', ...props }) => (
  <Svg size={size} color={color} {...props}>
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </Svg>
);

// Thermometer Icon
export const IconThermometer = ({ size = 24, color = '#333', ...props }) => (
  <Svg size={size} color={color} {...props}>
    <path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z" />
  </Svg>
);

// Sun Icon (for light)
export const IconSun = ({ size = 24, color = '#333', ...props }) => (
  <Svg size={size} color={color} {...props}>
    <circle cx="12" cy="12" r="5" />
    <line x1="12" y1="1" x2="12" y2="3" />
    <line x1="12" y1="21" x2="12" y2="23" />
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
    <line x1="1" y1="12" x2="3" y2="12" />
    <line x1="21" y1="12" x2="23" y2="12" />
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
  </Svg>
);

// Leaf Icon
export const IconLeaf = ({ size = 24, color = '#16a34a', ...props }) => (
  <Svg size={size} color={color} {...props}>
    <path d="M3 21c3-9 9-15 18-18-3 9-9 15-18 18Z" />
    <path d="M3 21c6-6 12-10 18-12" />
  </Svg>
);

export default {
  IconSettings,
  IconUsers,
  IconUser,
  IconBell,
  IconChevronRight,
  IconArrowUp,
  IconCloud,
  IconWifiCheck,
  IconDroplet,
  IconActivity,
  IconAlertTriangle,
  IconThermometer,
  IconSun,
  IconLeaf,
};
