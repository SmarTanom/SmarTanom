import { useState, useEffect } from 'react';

/**
 * Custom hook to handle PWA installation
 * Provides install prompt functionality and installation status
 */
export function usePWAInstall() {
  const [installPrompt, setInstallPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isInstallSupported, setIsInstallSupported] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if app is already installed
    const checkInstalled = () => {
      // Check for standalone mode (PWA is installed)
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      // Check for iOS standalone
      const isIOSStandalone = window.navigator.standalone === true;
      // Check for Android TWA
      const isAndroidTWA = document.referrer.startsWith('android-app://');

      setIsInstalled(isStandalone || isIOSStandalone || isAndroidTWA);
    };

    // Check if iOS
    const checkIOS = () => {
      const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
      setIsIOS(isIOSDevice);
    };

    // Handle beforeinstallprompt event
    const handleBeforeInstallPrompt = (event) => {
      console.log('beforeinstallprompt event fired!', event);
      // Prevent the mini-infobar from appearing on mobile
      event.preventDefault();
      // Save the event so it can be triggered later
      setInstallPrompt(event);
      setIsInstallSupported(true);
    };

    // Handle app installed event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setInstallPrompt(null);
      console.log('PWA was installed successfully');
    };

    checkInstalled();
    checkIOS();

    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    console.log('PWA Install hook initialized. iOS:', isIOSDevice);

    // Listen for PWA install events
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // For development: simulate install support if needed
    setTimeout(() => {
      setIsInstallSupported(true); // Always allow showing install instructions
      if (!installPrompt && !isIOSDevice) {
        console.log('No install prompt received after 2 seconds - showing manual instructions');
      }
    }, 2000);

    // Cleanup event listeners
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // Function to trigger install prompt
  const installApp = async () => {
    if (!installPrompt) {
      return { success: false, error: 'Install prompt not available' };
    }

    try {
      // Show the install prompt
      installPrompt.prompt();

      // Wait for user response
      const result = await installPrompt.userChoice;

      if (result.outcome === 'accepted') {
        setInstallPrompt(null);
        return { success: true };
      } else {
        return { success: false, error: 'User dismissed install prompt' };
      }
    } catch (error) {
      console.error('Error during PWA installation:', error);
      return { success: false, error: error.message };
    }
  };

  // Get install instructions for different platforms
  const getInstallInstructions = () => {
    const isAndroid = /Android/.test(navigator.userAgent);
    const isChrome = /Chrome/.test(navigator.userAgent) && !/Edg/.test(navigator.userAgent);
    const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);

    if (isIOS && isSafari) {
      return {
        title: 'Install SmarTanom App',
        steps: [
          'Tap the Share button in Safari',
          'Scroll down and tap "Add to Home Screen"',
          'Tap "Add" to install the app'
        ]
      };
    }

    if (isAndroid && isChrome) {
      return {
        title: 'Install SmarTanom App',
        steps: [
          'Tap the menu button (⋮) in Chrome',
          'Select "Add to Home screen"',
          'Tap "Add" to install the app'
        ]
      };
    }

    return {
      title: 'Install SmarTanom App',
      steps: [
        'Look for an "Install" or "Add to Home Screen" option in your browser menu',
        'Follow your browser\'s installation prompts'
      ]
    };
  };

  return {
    installApp,
    isInstalled,
    isInstallSupported: isInstallSupported || isIOS,
    isIOS,
    installPrompt: !!installPrompt,
    getInstallInstructions
  };
}
