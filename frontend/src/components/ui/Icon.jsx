import React from 'react';

const Svg = ({ size = 24, color = '#339432', stroke = 2, children, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" {...props}>
    {children}
  </svg>
);

export const ArrowLeft = (props) => (
  <Svg {...props}><path d="M15 18l-6-6 6-6"/><path d="M3 12h16"/></Svg>
);

// Filled chevron left (material style)
export const ChevronLeftFilled = ({ size = 24, color = '#ffffff', ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill={color}
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    focusable="false"
    {...props}
  >
    <path d="M0 0h24v24H0z" fill="none" />
    <path d="M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12l4.58-4.59z" />
  </svg>
);

export const Mail = (props) => (
  <Svg {...props}><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></Svg>
);

export const Shield = (props) => (
  <Svg {...props}><path d="M12 2l7 4v6c0 5-3.5 8-7 10-3.5-2-7-5-7-10V6l7-4z"/></Svg>
);

export const Leaf = (props) => (
  <Svg {...props}><path d="M4 14c6 0 10-4 10-10 6 0 6 10 0 14-3 2-7 2-10 0"/></Svg>
);

export const Wifi = (props) => (
  <Svg {...props}><path d="M5 12a7 7 0 0 1 14 0"/><path d="M8.5 14.5a4 4 0 0 1 7 0"/><path d="M12 18h0"/></Svg>
);

export default { ArrowLeft, Mail, Shield, Leaf, Wifi, ChevronLeftFilled };
