import React from 'react';
import greenLogo from '../../assets/images/logo-mark-green.png';
import whiteLogo from '../../assets/images/logo-mark-white.png';

// BrandMark renders a raster logo (green or white). It supports either a fixed `size` prop
// (width in px) or responsive sizing via external CSS using `className`.
export default function BrandMark({
  size = 0, // if 0, width is left to CSS
  alt = 'SmarTanom',
  style = {},
  className = '',
  variant = 'green'
}) {
  const src = variant === 'white' ? whiteLogo : greenLogo;
  const widthStyle = size ? { width: size } : {};
  return (
    <img
      src={src}
      alt={alt}
      className={className}
      style={{ ...widthStyle, height: 'auto', display: 'block', ...style }}
    />
  );
}
