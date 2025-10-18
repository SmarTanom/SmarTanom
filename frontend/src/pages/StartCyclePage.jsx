import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ChevronLeft, Search, Plus } from 'lucide-react';
import '../assets/styles/StartCyclePage.css';
import { listPlants } from '../services/api/plants.js';
import { createReservoir, updateReservoir } from '../services/api/reservoirs.js';
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
  const [selectedPlants, setSelectedPlants] = useState([]);
  const [plants, setPlants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const location = useLocation();
  const [selectedDeviceId, setSelectedDeviceId] = useState(null);
  const [reservoirId, setReservoirId] = useState(null);
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
        const reservoirFromState = fromState.reservoirId || fromState.reservoir_id || fromState.reservoir?.id;
        if (deviceFromState) {
          setSelectedDeviceId(Number(deviceFromState));
        } else {
          // Keep an error to prompt correct navigation
          setError('No device context provided. Please start a cycle from a device page.');
        }
        if (reservoirFromState) {
          setReservoirId(Number(reservoirFromState));
        }
      } catch (e) {
        setError(e.message || 'Failed to load plants or devices');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const selectedDevice = useMemo(() => selectedDeviceId ? { id: selectedDeviceId } : null, [selectedDeviceId]);

  const filteredPlants = plants.filter(plant =>
    plant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    plant.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const togglePlantSelection = (plantId) => {
    setSelectedPlants(prev => {
      if (prev.includes(plantId)) {
        return prev.filter(id => id !== plantId);
      }
      return [...prev, plantId];
    });
  };

  const handleStartCycle = async () => {
    setError('');
    if (!selectedDeviceId) {
      setError('No device found. Please start from a device page.');
      return;
    }
    if (selectedPlants.length === 0) {
      setError('Please select at least one plant.');
      return;
    }
    if (!startDate || !endDate) {
      setError('Please select start and end dates.');
      return;
    }
    if (endDate < startDate) {
      setError('End date cannot be before start date.');
      return;
    }

    try {
      setSubmitting(true);
      // Update the existing reservoir (preferred behavior)
      // Determine target reservoirId: from navigation state or fail
      const targetReservoirId = reservoirId;
      if (!targetReservoirId) {
        setError('No reservoir context to update. Please open Start Cycle from a device with an active cycle.');
        return;
      }

      // Use first selected plant; if multiple are selected, take the first
      const plantId = Number(selectedPlants[0]);
      const payload = {
        plant_id: plantId,
        start_date: startDate,
        end_date: endDate,
      };
      await updateReservoir(targetReservoirId, payload);
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
          Choose the type of plant you're growing to get tailored monitoring and nutrient recommendations.
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
            const isSelected = selectedPlants.includes(plant.id);
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
                  aria-label={isSelected ? 'Remove plant' : 'Add plant'}
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
      </div>

      {/* Footer */}
      <div className="start-cycle-footer">
        {/* Dates */}
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
        <button
          className="start-button"
          onClick={handleStartCycle}
          disabled={selectedPlants.length === 0 || !selectedDeviceId || submitting}
        >
          {submitting ? 'Starting…' : 'Start Cycle'}
        </button>
        <p className="help-text">
          Don't see your plant? <a href="#" className="message-link">Message us</a>
        </p>
      </div>
    </div>
  );
};

export default StartCyclePage;
