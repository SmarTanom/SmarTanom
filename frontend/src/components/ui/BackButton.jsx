import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from './Icon.jsx';

export default function BackButton({ label = 'Back' }) {
  const navigate = useNavigate();
  return (
    <button type="button" onClick={() => navigate(-1)} aria-label={label} className="back-btn" style={{ justifySelf: 'start' }}>
      <ArrowLeft size={18} /> {label}
    </button>
  );
}
