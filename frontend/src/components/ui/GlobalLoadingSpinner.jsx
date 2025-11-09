import React from 'react';
import { Loader } from 'lucide-react';
import '../../assets/styles/GlobalLoadingSpinner.css';

const PRIMARY_GREEN = 'rgba(51, 148, 50, 0.9)';

export default function GlobalLoadingSpinner({ message = 'Loading...', size = 48 }) {
  return (
    <div className="global-loading-container">
      <Loader size={size} color={PRIMARY_GREEN} className="global-loading-spinner" />
      <p className="global-loading-text">{message}</p>
    </div>
  );
}
