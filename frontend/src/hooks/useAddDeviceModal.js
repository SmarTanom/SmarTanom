import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

/**
 * Custom hook to manage AddDevice modal with authentication check
 * 
 * Usage:
 * ```jsx
 * const { isModalOpen, openModal, closeModal } = useAddDeviceModal();
 * 
 * <button onClick={openModal}>Add Device</button>
 * <AddDeviceModal isOpen={isModalOpen} onClose={closeModal} />
 * ```
 */
export const useAddDeviceModal = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const openModal = () => {
    // Check authentication before opening modal
    if (!isAuthenticated) {
      // Redirect to signup if not authenticated
      navigate('/signup/setup');
      return;
    }

    // Open modal if authenticated
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  return {
    isModalOpen,
    openModal,
    closeModal,
    isAuthenticated
  };
};

export default useAddDeviceModal;
