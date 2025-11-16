import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ChevronLeft, Search, Plus, Calendar } from 'lucide-react';
import '../assets/styles/StartCyclePage.css';
import { listPlants } from '../services/api/plants.js';
import { deviceApi } from '../services/apiClient.js';
// Device is inferred from DeviceDetails navigation; no need to fetch all devices

const PRIMARY_GREEN = 'rgba(51, 148, 50, 0.9)';

const categoryFor = (name) => {
  // Simple grouping heuristic; backend doesn't provide category yet
  const n = (name || '').toLowerCase();
  if (['basil', 'mint', 'oregano', 'thyme', 'parsley', 'cilantro', 'chives'].some(k => n.includes(k))) return 'Herbs';
  if (['romaine', 'butterhead', 'batavia', 'arugula', 'looseleaf'].some(k => n.includes(k))) return 'Lettuce';
  if (['spinach', 'kale'].some(k => n.includes(k))) return 'Leafy Greens';
  if (['bok', 'pechay'].some(k => n.includes(k))) return 'Bok Choy';
  return 'Other';
};

const StartCyclePage = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlant, setSelectedPlant] = useState(null); // Changed to single plant selection
  const [plants, setPlants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const location = useLocation();
  const [selectedDeviceId, setSelectedDeviceId] = useState(null);
  // Reservoir model removed; device fields will be updated directly
  const [submitting, setSubmitting] = useState(false);
  const todayISO = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().slice(0, 10);
  });

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError('');
        // Load plants
        const data = await listPlants('');
        const items = Array.isArray(data) ? data : (data.results || []);
        setPlants(items.map(p => ({
          id: p.id,
          name: p.plant_name,
          category: categoryFor(p.plant_name),
          image: '🥬',
          description: ''
        })));
        // Resolve deviceId from navigation state
        const fromState = location?.state || {};
        const deviceFromState = fromState.deviceId || fromState.device_id;
        if (deviceFromState) {
          setSelectedDeviceId(Number(deviceFromState));
        } else {
          // Keep an error to prompt correct navigation
          setError('No device context provided. Please start a cycle from a device page.');
        }
        // No reservoir context needed anymore
      } catch (e) {
        setError(e.message || 'Failed to load plants or devices');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Ensure date inputs scroll into view so the native calendar isn't obscured by the sticky footer
  useEffect(() => {
    const ids = ['startDate', 'endDate'];
    const handlers = [];
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) {
        const handler = () => {
          try {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          } catch (_) {
            // no-op
          }
        };
        el.addEventListener('focus', handler);
        el.addEventListener('click', handler);
        handlers.push([el, handler]);
      }
    });
    return () => {
      handlers.forEach(([el, handler]) => {
        el.removeEventListener('focus', handler);
        el.removeEventListener('click', handler);
      });
    };
  }, []);

  const selectedDevice = useMemo(() => selectedDeviceId ? { id: selectedDeviceId } : null, [selectedDeviceId]);

  const filteredPlants = plants.filter(plant =>
    plant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    plant.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const togglePlantSelection = (plantId) => {
    // Only allow single plant selection per device/cycle
    if (selectedPlant === plantId) {
      setSelectedPlant(null); // Deselect if clicking the same plant
    } else {
      setSelectedPlant(plantId); // Select the new plant (replaces any previous selection)
    }
  };

  const handleStartCycle = async () => {
    setError('');
    if (!selectedDeviceId) {
      setError('No device found. Please start from a device page.');
      return;
    }
    if (!selectedPlant) {
      setError('Please select a plant for this cycle. Each device can grow one plant at a time with specific thresholds.');
      return;
    }
    if (!startDate || !endDate) {
      setError('Please select start and end dates for the growing cycle.');
      return;
    }
    if (endDate < startDate) {
      setError('End date cannot be before start date.');
      return;
    }

    try {
      setSubmitting(true);
      // Update the device with the new cycle info (plant_id, start_date, end_date)
      const token = localStorage.getItem('authToken');
      if (!token) throw new Error('Missing authentication. Please log in again.');
      const plantIdNum = Number(selectedPlant);
      const payload = {
        plant_id: plantIdNum,
        start_date: startDate,
        end_date: endDate,
      };
      await deviceApi.update(selectedDeviceId, payload, token);
      // Success: go back to dashboard
      navigate('/dashboard');
    } catch (e) {
      let msg = e?.message || 'Failed to start cycle';
      // Try to include server-side validation errors if present
      if (e?.data && typeof e.data === 'object') {
        const details = Object.entries(e.data)
          .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : String(v)}`)
          .join(' | ');
        if (details) msg = `${msg} — ${details}`;
      }
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // Helpers for date min/max and quick presets
  const setDurationDays = (days) => {
    try {
      const s = new Date(startDate);
      const d = new Date(s);
      d.setDate(s.getDate() + Number(days));
      setEndDate(d.toISOString().slice(0,10));
    } catch (_) {}
  };

  const onChangeStart = (val) => {
    setStartDate(val);
    // Keep endDate >= startDate
    if (endDate < val) {
      setEndDate(val);
    }
  };

  return (
    <div className="start-cycle-root">
      {/* Header */}
      <div className="start-cycle-header">
        <button
          className="back-button"
          onClick={() => navigate('/dashboard')}
          aria-label="Go back"
        >
          <ChevronLeft size={24} color="var(--color-text)" />
        </button>
      </div>

      {/* Content */}
      <div className="start-cycle-content">
        <h1 className="cycle-title">Start a New Cycle</h1>
        <p className="cycle-subtitle">
          Choose one plant and set your cycle dates. We’ll apply the right thresholds for healthy growth.
        </p>

        {!loading && !selectedDeviceId && (
          <div className="no-results"><p>{error || 'No device selected. Please start from a device.'}</p></div>
        )}

        <div className="start-cycle-grid">
          {/* Left: plant selector */}
          <section className="sc-left" aria-label="Plant selection">
            <div className="search-container" role="search">
              <Search size={20} color="var(--color-muted)" />
              <input
                type="text"
                className="search-input"
                placeholder="Search plants"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Search plants"
              />
            </div>

            {error && (
              <div className="no-results"><p>{error}</p></div>
            )}
            {loading && !error && (
              <div className="no-results"><p>Loading plants…</p></div>
            )}

            <div className="plant-list" role="list">
              {filteredPlants.map(plant => {
                const isSelected = selectedPlant === plant.id;
                return (
                  <div
                    key={plant.id}
                    className={`plant-item ${isSelected ? 'selected' : ''}`}
                    onClick={() => togglePlantSelection(plant.id)}
                    role="listitem"
                    aria-pressed={isSelected}
                  >
                    <div className="plant-info">
                      <span className="plant-emoji" aria-hidden>{plant.image}</span>
                      <div className="plant-text">
                        <div className="plant-name">{plant.name}</div>
                        <div className="plant-category">{plant.category}</div>
                      </div>
                    </div>
                    <button
                      className={`add-button ${isSelected ? 'added' : ''}`}
                      aria-label={isSelected ? 'Selected plant' : `Select ${plant.name}`}
                      type="button"
                    >
                      <Plus size={20} />
                    </button>
                  </div>
                );
              })}
            </div>

            {!loading && filteredPlants.length === 0 && (
              <div className="no-results">
                <p>No plants found matching "{searchQuery}"</p>
              </div>
            )}
          </section>

          {/* Right: summary and dates */}
          <aside className="sc-right" aria-label="Cycle summary and dates">
            <div className="summary-card">
              <div className="summary-header">
                <h2>Cycle setup</h2>
                {selectedPlant ? (
                  <div className="selected-pill">Plant selected</div>
                ) : (
                  <div className="selected-pill muted">Select a plant</div>
                )}
              </div>

              <div className="summary-plant">
                {selectedPlant ? (
                  (() => {
                    const p = plants.find(x => x.id === selectedPlant);
                    return (
                      <div className="summary-plant-row">
                        <span className="plant-emoji" aria-hidden>{p?.image}</span>
                        <div className="plant-text">
                          <div className="plant-name">{p?.name}</div>
                          <div className="plant-category">{p?.category}</div>
                        </div>
                      </div>
                    );
                  })()
                ) : (
                  <p className="summary-placeholder">Pick a plant from the list</p>
                )}
              </div>

              <div className="date-block">
                <label htmlFor="startDate" className="date-label with-icon">
                  <Calendar size={16} />
                  Start date
                </label>
                <input
                  id="startDate"
                  type="date"
                  className="date-input"
                  value={startDate}
                  min={todayISO}
                  onChange={(e) => onChangeStart(e.target.value)}
                />

                <label htmlFor="endDate" className="date-label with-icon" style={{marginTop: 12}}>
                  <Calendar size={16} />
                  End date
                </label>
                <input
                  id="endDate"
                  type="date"
                  className="date-input"
                  value={endDate}
                  min={startDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />

                <div className="quick-presets" role="group" aria-label="Quick durations">
                  {[30,45,60,90].map((d)=> (
                    <button key={d} type="button" className="preset-chip" onClick={() => setDurationDays(d)}>
                      {d} days
                    </button>
                  ))}
                </div>
                <p className="hint">End date adjusts automatically and can’t be before the start date.</p>
              </div>

              {error && (
                <div className="error-box" role="alert">{error}</div>
              )}

              <button
                className="start-button summary-action"
                onClick={handleStartCycle}
                disabled={!selectedPlant || !selectedDeviceId || submitting}
              >
                {submitting ? 'Starting Cycle…' : selectedPlant ? 'Start Cycle' : 'Select a Plant to Continue'}
              </button>
              <p className="help-text">One plant per device • Custom thresholds for each variety</p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default StartCyclePage;
