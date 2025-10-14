import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Search, Plus } from 'lucide-react';
import '../assets/styles/StartCyclePage.css';
import { listPlants } from '../services/api/plants.js';

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

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const data = await listPlants('');
        const items = Array.isArray(data) ? data : (data.results || []);
        // Map backend shape to UI shape
        setPlants(items.map(p => ({
          id: p.id,
          name: p.plant_name,
          category: categoryFor(p.plant_name),
          image: '🥬',
          description: ''
        })));
      } catch (e) {
        setError(e.message || 'Failed to load plants');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

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

  const handleStartCycle = () => {
    if (selectedPlants.length === 0) {
      return;
    }
    // Here you would normally make an API call to start the cycle
    // For now, just navigate back to dashboard
    console.log('Starting cycle with plants:', selectedPlants);
    navigate('/dashboard');
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
        <button
          className="start-button"
          onClick={handleStartCycle}
          disabled={selectedPlants.length === 0}
        >
          Start Cycle
        </button>
        <p className="help-text">
          Don't see your plant? <a href="#" className="message-link">Message us</a>
        </p>
      </div>
    </div>
  );
};

export default StartCyclePage;
