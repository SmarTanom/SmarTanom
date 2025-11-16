import React, { useState } from 'react';

export default function SettingsView({ device, onSaveInfo, onResetWiFi, onStartNewCycle, saving, canManage }) {
  const [name, setName] = useState(device?.device_name || '');
  const [location, setLocation] = useState(device?.location || '');

  return (
    <div className="grid-2">
      <div className="section">
        <h3>Device Info</h3>
        <div className="content">
          <div className="row">
            <div>
              <label className="label">Device name</label>
              <input className="input" value={name} onChange={(e)=>setName(e.target.value)} placeholder="My Hydroponics" />
            </div>
            <div>
              <label className="label">Location</label>
              <input className="input" value={location} onChange={(e)=>setLocation(e.target.value)} placeholder="Balcony, Kitchen…" />
            </div>
          </div>
          <div className="actions">
            <button className="btn-primary" disabled={saving || !name.trim()} onClick={() => onSaveInfo?.({ device_name: name.trim(), location: location.trim() || null })}>
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </div>
      </div>

      <div className="section">
        <h3>Device Actions</h3>
        <div className="content">
          <div className="actions">
            <button className="btn-primary" onClick={onStartNewCycle}>Start New Cycle</button>
            <button className="btn-soft" onClick={onResetWiFi}>Reset WiFi</button>
          </div>
        </div>
      </div>
    </div>
  );
}
