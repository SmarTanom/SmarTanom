import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Search, Plus } from 'lucide-react';
import '../assets/styles/StartCyclePage.css';

const PRIMARY_GREEN = 'rgba(51, 148, 50, 0.9)';

// Mock plant data - can be expanded
const PLANT_DATABASE = [
  {
    id: 1,
    name: 'Romaine',
    category: 'Lettuce',
    image: '🥬',
    description: 'Crisp lettuce with elongated leaves'
  },
  {
    id: 2,
    name: 'Butterhead',
    category: 'Lettuce',
    image: '🥬',
    description: 'Soft, buttery textured lettuce'
  },
  {
    id: 3,
    name: 'Batavia',
    category: 'Lettuce',
    image: '🥬',
    description: 'Crispy lettuce with wavy leaves'
  },
  {
    id: 4,
    name: 'Pechay',
    category: 'Bok Choy',
    image: '🥬',
    description: 'Asian green leafy vegetable'
  },
  {
    id: 5,
    name: 'Basil',
    category: 'Herbs',
    image: '🌿',
    description: 'Aromatic herb for cooking'
  },
  {
    id: 6,
    name: 'Arugula',
    category: 'Lettuce',
    image: '🥬',
    description: 'Peppery, flavorful greens'
  },
  {
    id: 7,
    name: 'Spinach',
    category: 'Leafy Greens',
    image: '🥬',
    description: 'Nutrient-rich leafy green'
  },
  {
    id: 8,
    name: 'Kale',
    category: 'Leafy Greens',
    image: '🥬',
    description: 'Hardy, nutritious green'
  }
];

const StartCyclePage = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlants, setSelectedPlants] = useState([]);

  const filteredPlants = PLANT_DATABASE.filter(plant =>
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

        {filteredPlants.length === 0 && (
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
