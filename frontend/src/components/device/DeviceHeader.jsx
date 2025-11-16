import React from 'react';
import { MapPin, Wifi, Camera } from 'lucide-react';

export default function DeviceHeader({
  name,
  serial,
  location,
  photoUrl,
  isOnline,
  wifiConfigured,
  onChangePhoto,
}) {
  return (
    <div className="device-header">
      <div className="device-avatar">
        <img src={photoUrl} alt={name || 'Plant'} />
      </div>
      <div className="device-title">
        <h1>{name || serial || 'Device'}</h1>
        <div className="device-subtitle">
          <span className="badge" title="Device serial">
            <span className="dot" />
            {serial}
          </span>
          {location ? (
            <span className="badge" title="Location">
              <MapPin size={14} />
              {location}
            </span>
          ) : null}
          <span className="badge" title={isOnline ? 'Online' : 'Offline'}>
            <span className={`dot ${isOnline ? '' : 'red'}`} />
            {isOnline ? 'Online' : 'Offline'}
          </span>
          <span className="badge" title="WiFi">
            <Wifi size={14} />
            {wifiConfigured ? 'WiFi' : 'No WiFi'}
          </span>
        </div>
      </div>
      <div className="header-actions">
        <button className="btn-soft" onClick={onChangePhoto}>
          <Camera size={16} /> Change photo
        </button>
      </div>
    </div>
  );
}
