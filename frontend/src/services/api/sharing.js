import { apiClient } from '../apiClient';

/**
 * Device Sharing API Service
 * Handles device collaboration and access management
 */

// Share a device with another user
// permission should be a string: 'view_only' or 'manage' (defaults to 'view_only')
export const shareDevice = async (deviceId, inviteEmail, permission = 'view_only') => {
  try {
    const token = localStorage.getItem('authToken');
    if (!token) {
      throw new Error('No authentication token found');
    }

    const response = await apiClient.post(
      `/api/devices/devices/${deviceId}/share/`,
      {
        invite_email: inviteEmail,
        permissions: typeof permission === 'string' ? permission : 'view_only',
        message: 'You have been invited to monitor this device'
      },
      { authToken: token }
    );

    return response;
  } catch (error) {
    console.error('Failed to share device:', error);
    throw error;
  }
};

// Get device collaborators (who has access to this device)
export const getDeviceCollaborators = async (deviceId) => {
  try {
    const token = localStorage.getItem('authToken');
    if (!token) {
      throw new Error('No authentication token found');
    }

    const response = await apiClient.get(`/api/devices/devices/${deviceId}/collaborators/`, { authToken: token });

    return response;
  } catch (error) {
    console.error('Failed to fetch device collaborators:', error);
    throw error;
  }
};

// Get all shared devices (where current user is collaborator)
export const getSharedDevices = async () => {
  try {
    const token = localStorage.getItem('authToken');
    if (!token) {
      throw new Error('No authentication token found');
    }

    const response = await apiClient.get('/api/devices/shared/', { authToken: token });

    return response;
  } catch (error) {
    console.error('Failed to fetch shared devices:', error);
    throw error;
  }
};

// Revoke device access from a collaborator
export const revokeDeviceAccess = async (deviceId, collaboratorId) => {
  try {
    const token = localStorage.getItem('authToken');
    if (!token) {
      throw new Error('No authentication token found');
    }

    const response = await apiClient.request(
      `/api/devices/devices/${deviceId}/collaborators/${collaboratorId}/`,
      { method: 'DELETE', authToken: token }
    );

    return response;
  } catch (error) {
    console.error('Failed to revoke device access:', error);
    throw error;
  }
};

// Accept device invitation
export const acceptDeviceInvitation = async (invitationToken) => {
  try {
    const token = localStorage.getItem('authToken');
    if (!token) {
      throw new Error('No authentication token found');
    }

    const response = await apiClient.post(
      '/api/devices/invitations/respond/',
      {
        action: 'accept',
        token: invitationToken,
      },
      { authToken: token }
    );

    return response;
  } catch (error) {
    console.error('Failed to accept device invitation:', error);
    throw error;
  }
};

// Decline device invitation
export const declineDeviceInvitation = async (invitationToken) => {
  try {
    const token = localStorage.getItem('authToken');
    if (!token) {
      throw new Error('No authentication token found');
    }

    const response = await apiClient.post(
      '/api/devices/invitations/respond/',
      {
        action: 'decline',
        token: invitationToken,
      },
      { authToken: token }
    );

    return response;
  } catch (error) {
    console.error('Failed to decline device invitation:', error);
    throw error;
  }
};

// Get pending invitations for current user
export const getPendingInvitations = async () => {
  try {
    const token = localStorage.getItem('authToken');
    if (!token) {
      throw new Error('No authentication token found');
    }

    const response = await apiClient.get('/api/devices/invitations/pending/', { authToken: token });

    return response;
  } catch (error) {
    console.error('Failed to fetch pending invitations:', error);
    throw error;
  }
};

// Get invitations the current user has sent (optionally for a specific device)
export const getSentInvitations = async (deviceId) => {
  try {
    const token = localStorage.getItem('authToken');
    if (!token) {
      throw new Error('No authentication token found');
    }

    const url = deviceId
      ? `/api/devices/invitations/sent/?device_id=${encodeURIComponent(deviceId)}`
      : '/api/devices/invitations/sent/';

    const response = await apiClient.get(url, { authToken: token });
    return response;
  } catch (error) {
    console.error('Failed to fetch sent invitations:', error);
    throw error;
  }
};
