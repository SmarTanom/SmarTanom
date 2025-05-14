import React, { createContext, useState, useContext } from 'react';

// Default device images
const defaultImages = {
  '0000000001': require('../assets/porch-plant.png'),     // Porch SmarTanom
  '0000000002': require('../assets/hydroponic-plant.jpg') // Backyard SmarTanom
};

// Create the context
const DeviceImageContext = createContext();

// Provider component
export const DeviceImageProvider = ({ children }) => {
  // State to store custom images for each device
  const [deviceImages, setDeviceImages] = useState(defaultImages);

  // Function to update a device's image
  const updateDeviceImage = (deviceId, newImage) => {
    setDeviceImages(prevImages => ({
      ...prevImages,
      [deviceId]: newImage
    }));
  };

  // Reset to default images
  const resetDeviceImages = () => {
    setDeviceImages(defaultImages);
  };

  // Get image for a specific device
  const getDeviceImage = (deviceId) => {
    return deviceImages[deviceId] || defaultImages[deviceId];
  };

  return (
    <DeviceImageContext.Provider 
      value={{ 
        deviceImages, 
        updateDeviceImage, 
        resetDeviceImages,
        getDeviceImage
      }}
    >
      {children}
    </DeviceImageContext.Provider>
  );
};

// Custom hook to use the device image context
export const useDeviceImages = () => {
  const context = useContext(DeviceImageContext);
  if (!context) {
    throw new Error('useDeviceImages must be used within a DeviceImageProvider');
  }
  return context;
};
