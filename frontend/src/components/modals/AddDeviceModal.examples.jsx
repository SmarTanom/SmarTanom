/**
 * USAGE EXAMPLES FOR AddDeviceModal
 * ===================================
 * 
 * This file demonstrates how to integrate the AddDeviceModal
 * component throughout your application.
 */

// ============================================
// EXAMPLE 1: Using in Dashboard or any page
// ============================================
import React from 'react';
import { Plus } from 'lucide-react';
import AddDeviceModal from '../components/modals/AddDeviceModal';
import { useAddDeviceModal } from '../hooks/useAddDeviceModal';

function Dashboard() {
  const { isModalOpen, openModal, closeModal } = useAddDeviceModal();

  return (
    <div>
      <h1>Dashboard</h1>
      
      {/* Button to trigger modal */}
      <button onClick={openModal} className="btn btn-primary">
        <Plus size={20} />
        Add New Device
      </button>

      {/* Modal component */}
      <AddDeviceModal 
        isOpen={isModalOpen} 
        onClose={closeModal} 
      />
    </div>
  );
}

// ============================================
// EXAMPLE 2: Using in Navigation/Header
// ============================================
import React from 'react';
import { Plus } from 'lucide-react';
import AddDeviceModal from '../components/modals/AddDeviceModal';
import { useAddDeviceModal } from '../hooks/useAddDeviceModal';

function Navigation() {
  const { isModalOpen, openModal, closeModal } = useAddDeviceModal();

  return (
    <nav>
      <div>Logo</div>
      <button onClick={openModal}>
        <Plus size={18} />
        Add Device
      </button>

      <AddDeviceModal 
        isOpen={isModalOpen} 
        onClose={closeModal} 
      />
    </nav>
  );
}

// ============================================
// EXAMPLE 3: Manual Auth Check (without hook)
// ============================================
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import AddDeviceModal from '../components/modals/AddDeviceModal';
import { Plus } from 'lucide-react';

function DevicesPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const handleAddDevice = () => {
    if (!isAuthenticated) {
      // Redirect to signup if not authenticated
      navigate('/signup/setup');
      return;
    }

    // Open modal if authenticated
    setIsModalOpen(true);
  };

  return (
    <div>
      <h1>My Devices</h1>
      
      <button onClick={handleAddDevice} className="btn btn-primary">
        <Plus size={20} />
        Add Device
      </button>

      <AddDeviceModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
    </div>
  );
}

// ============================================
// EXAMPLE 4: Floating Action Button (FAB)
// ============================================
import React from 'react';
import { Plus } from 'lucide-react';
import AddDeviceModal from '../components/modals/AddDeviceModal';
import { useAddDeviceModal } from '../hooks/useAddDeviceModal';

function DashboardWithFAB() {
  const { isModalOpen, openModal, closeModal } = useAddDeviceModal();

  return (
    <div>
      <h1>Dashboard</h1>
      
      {/* Floating Action Button */}
      <button 
        className="floating-action-button"
        onClick={openModal}
        aria-label="Add new device"
      >
        <Plus size={24} />
      </button>

      <AddDeviceModal 
        isOpen={isModalOpen} 
        onClose={closeModal} 
      />
    </div>
  );
}

// ============================================
// EXAMPLE 5: Using in Sidebar Navigation
// ============================================
import React from 'react';
import { Plus, Home, Settings, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AddDeviceModal from '../components/modals/AddDeviceModal';
import { useAddDeviceModal } from '../hooks/useAddDeviceModal';

function Sidebar() {
  const navigate = useNavigate();
  const { isModalOpen, openModal, closeModal } = useAddDeviceModal();

  return (
    <aside className="sidebar">
      <nav>
        <button onClick={() => navigate('/dashboard')}>
          <Home size={20} />
          Dashboard
        </button>
        
        {/* Add Device button in sidebar */}
        <button onClick={openModal} className="highlight">
          <Plus size={20} />
          Add Device
        </button>
        
        <button onClick={() => navigate('/profile')}>
          <User size={20} />
          Profile
        </button>
        
        <button onClick={() => navigate('/settings')}>
          <Settings size={20} />
          Settings
        </button>
      </nav>

      <AddDeviceModal 
        isOpen={isModalOpen} 
        onClose={closeModal} 
      />
    </aside>
  );
}

// ============================================
// API INTEGRATION NOTES
// ============================================

/**
 * To connect the modal to your backend API:
 * 
 * 1. Update AddDeviceModal.jsx handleNext function (step 4):
 * 
 * ```jsx
 * if (currentStep === 4) {
 *   try {
 *     // Call your device API
 *     const response = await deviceApi.addDevice({
 *       device_serial: formData.deviceId,
 *       device_name: formData.deviceName,
 *       email: formData.email,
 *       wifi_ssid: formData.wifiSSID,
 *       wifi_password: formData.wifiPassword,
 *       wifi_hidden: formData.wifiHidden
 *     });
 *     
 *     // Show success message
 *     toast.success('Device added successfully!');
 *     
 *     // Close modal and refresh
 *     handleClose();
 *     navigate('/dashboard');
 *     
 *   } catch (error) {
 *     setError(error.message || 'Failed to add device');
 *     setIsLoading(false);
 *     return;
 *   }
 * }
 * ```
 * 
 * 2. For OTP verification (step 3):
 * 
 * ```jsx
 * if (currentStep === 3) {
 *   try {
 *     await authApi.verifyOTP({
 *       email: formData.email,
 *       code: formData.otp
 *     });
 *     setCurrentStep(4);
 *   } catch (error) {
 *     setError('Invalid verification code');
 *     return;
 *   }
 * }
 * ```
 * 
 * 3. For email binding (step 2):
 * 
 * ```jsx
 * if (currentStep === 2) {
 *   try {
 *     await authApi.sendOTP({ email: formData.email });
 *     setCurrentStep(3);
 *   } catch (error) {
 *     setError('Failed to send verification code');
 *     return;
 *   }
 * }
 * ```
 */

export {
  Dashboard,
  Navigation,
  DevicesPage,
  DashboardWithFAB,
  Sidebar
};
