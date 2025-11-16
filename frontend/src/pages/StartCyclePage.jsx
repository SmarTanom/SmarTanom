import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ChevronLeft, Search, Plus } from 'lucide-react';
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
        <h1 className="cycle-title">Starting a New Cycle!</h1>
        <p className="cycle-subtitle">
          Select one plant for this device. Each plant has specific water, pH, and nutrient thresholds tailored for optimal growth.
        </p>

        {/* Device is determined by the page you came from; no manual selection here */}
        {!loading && !selectedDeviceId && (
          <div className="no-results"><p>{error || 'No device selected. Please start from a device.'}</p></div>
        )}

        {/* Search Bar */}
        <div className="search-container">
          <Search size={20} color="var(--color-muted)" />
          <input
            type="text"
            className="search-input"
            placeholder="Search plants"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Plant List */}
        {error && (
          <div className="no-results"><p>{error}</p></div>
        )}
        {loading && !error && (
          <div className="no-results"><p>Loading plants…</p></div>
        )}
        <div className="plant-list">
          {filteredPlants.map(plant => {
            const isSelected = selectedPlant === plant.id;
            return (
              <div
                key={plant.id}
                className={`plant-item ${isSelected ? 'selected' : ''}`}
                onClick={() => togglePlantSelection(plant.id)}
              >
                <div className="plant-info">
                  <span className="plant-emoji">{plant.image}</span>
                  <div className="plant-text">
                    <div className="plant-name">{plant.name}</div>
                    <div className="plant-category">{plant.category}</div>
                  </div>
                </div>
                <button
                  className={`add-button ${isSelected ? 'added' : ''}`}
                  aria-label={isSelected ? 'Selected plant' : 'Select plant'}
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

        {/* Dates moved into content to avoid calendar overlap with fixed footer */}
        <div className="date-section">
          <div className="date-row">
            <div className="date-field">
              <label htmlFor="startDate" className="date-label">Start date</label>
              <input
                id="startDate"
                type="date"
                className="date-input"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="date-field">
              <label htmlFor="endDate" className="date-label">End date</label>
              <input
                id="endDate"
                type="date"
                className="date-input"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="start-cycle-footer">
        <button
          className="start-button"
          onClick={handleStartCycle}
          disabled={!selectedPlant || !selectedDeviceId || submitting}
        >
          {submitting ? 'Starting Cycle…' : selectedPlant ? 'Start Cycle with Selected Plant' : 'Select a Plant to Continue'}
        </button>
        <p className="help-text">
          One plant per device • Custom thresholds for each variety
        </p>
      </div>
    </div>
  );
};

export default StartCyclePage;
