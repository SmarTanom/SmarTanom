/**
 * Admin Realtime Store
 * Centralized Zustand store for admin dashboard data with WebSocket integration
 * Manages admin stats, devices, users with real-time updates and persistence
 *
 * Note: Admin store handles WebSocket events that affect admin views (all devices, all users, stats).
 * The user dashboard store (realtimeStore.js) handles events for the current user's devices only.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getAdminStats, getAdminDevices, getAdminUsers } from '../services/api/admin';
import { wsClient } from '../services/websocketClient';

const useAdminRealtimeStore = create(
  persist(
    (set, get) => ({
      // State
      adminStats: null,
      allDevices: [],
      allUsers: [],

      loadingStats: false,
      loadingDevices: false,
      loadingUsers: false,

      errorStats: null,
      errorDevices: null,
      errorUsers: null,

      wsStatus: 'disconnected', // 'connecting' | 'connected' | 'disconnected'

      /**
       * Fetch admin dashboard statistics
       */
      fetchAdminStats: async () => {
        try {
          set({ loadingStats: true, errorStats: null });
          const stats = await getAdminStats();
          set({ adminStats: stats, loadingStats: false });
          return stats;
        } catch (error) {
          const errorMessage = error.response?.data?.message || error.message || 'Failed to fetch admin stats';
          set({ errorStats: errorMessage, loadingStats: false });
          throw error;
        }
      },

      /**
       * Fetch all devices for admin management
       */
      fetchAdminDevices: async () => {
        try {
          set({ loadingDevices: true, errorDevices: null });
          const devices = await getAdminDevices();
          const safeDevices = Array.isArray(devices) ? devices : [];
          set({ allDevices: safeDevices, loadingDevices: false });
          return safeDevices;
        } catch (error) {
          const errorMessage = error.response?.data?.message || error.message || 'Failed to fetch devices';
          set({ errorDevices: errorMessage, loadingDevices: false });
          throw error;
        }
      },

      /**
       * Fetch all users for admin management
       */
      fetchAdminUsers: async () => {
        try {
          set({ loadingUsers: true, errorUsers: null });
          const users = await getAdminUsers();
          const safeUsers = Array.isArray(users) ? users : (users?.results || []);
          set({ allUsers: safeUsers, loadingUsers: false });
          return safeUsers;
        } catch (error) {
          const errorMessage = error.response?.data?.message || error.message || 'Failed to fetch users';
          set({ errorUsers: errorMessage, loadingUsers: false });
          throw error;
        }
      },

      /**
       * Remove a user from the local store (optimistic update)
       */
      removeUser: (userId) => {
        const { allUsers } = get();
        set({ allUsers: allUsers.filter(u => u.id !== userId) });
      },

      /**
       * Apply real-time updates from WebSocket
       * Handles incremental updates to avoid full data refetches
       */
      applyAdminUpdate: (payload) => {
        const { action, data } = payload;

        switch (action) {
          case 'device_created': {
            // Add new device to allDevices
            const { allDevices, adminStats } = get();
            const exists = allDevices.some(d => d.id === data.device_id || d.device_serial === data.device_serial);
            if (!exists) {
              set({
                allDevices: [...allDevices, data],
                // Optimistically update stats
                adminStats: adminStats ? {
                  ...adminStats,
                  summary: {
                    ...adminStats.summary,
                    devices: {
                      ...adminStats.summary.devices,
                      total: (adminStats.summary.devices?.total || 0) + 1,
                      available: (adminStats.summary.devices?.available || 0) + 1
                    }
                  }
                } : adminStats
              });
            }
            break;
          }

          case 'bind':
          case 'device_bound': {
            // Update device binding status
            const { allDevices, adminStats } = get();
            const deviceIndex = allDevices.findIndex(
              d => d.id === data.device_id || d.device_serial === data.device_serial
            );

            if (deviceIndex !== -1) {
              const updatedDevices = [...allDevices];
              updatedDevices[deviceIndex] = {
                ...updatedDevices[deviceIndex],
                is_bound: true,
                owner: data.owner_id,
                bound_email: data.bound_email,
                owner_name: data.owner_name,
                last_seen: data.timestamp || updatedDevices[deviceIndex].last_seen
              };

              set({
                allDevices: updatedDevices,
                // Update stats: available decreases, active increases
                adminStats: adminStats ? {
                  ...adminStats,
                  summary: {
                    ...adminStats.summary,
                    devices: {
                      ...adminStats.summary.devices,
                      active: (adminStats.summary.devices?.active || 0) + 1,
                      available: Math.max(0, (adminStats.summary.devices?.available || 0) - 1),
                      bound: (adminStats.summary.devices?.bound || 0) + 1
                    }
                  }
                } : adminStats
              });
            }
            break;
          }

          case 'unbind':
          case 'device_unbound': {
            // Update device unbinding status
            const { allDevices, adminStats } = get();
            const deviceIndex = allDevices.findIndex(
              d => d.id === data.device_id || d.device_serial === data.device_serial
            );

            if (deviceIndex !== -1) {
              const updatedDevices = [...allDevices];
              updatedDevices[deviceIndex] = {
                ...updatedDevices[deviceIndex],
                is_bound: false,
                owner: null,
                bound_email: null,
                owner_name: null,
                last_seen: data.timestamp || updatedDevices[deviceIndex].last_seen
              };

              set({
                allDevices: updatedDevices,
                // Update stats: available increases, active decreases
                adminStats: adminStats ? {
                  ...adminStats,
                  summary: {
                    ...adminStats.summary,
                    devices: {
                      ...adminStats.summary.devices,
                      active: Math.max(0, (adminStats.summary.devices?.active || 0) - 1),
                      available: (adminStats.summary.devices?.available || 0) + 1,
                      bound: Math.max(0, (adminStats.summary.devices?.bound || 0) - 1)
                    }
                  }
                } : adminStats
              });
            }
            break;
          }

          case 'collaborator_added': {
            // Update device collaborations count
            const { allDevices } = get();
            const deviceIndex = allDevices.findIndex(d => d.id === data.device_id);

            if (deviceIndex !== -1) {
              const updatedDevices = [...allDevices];
              const currentCollab = updatedDevices[deviceIndex].collaborations_count || 0;
              updatedDevices[deviceIndex] = {
                ...updatedDevices[deviceIndex],
                collaborations_count: currentCollab + 1
              };
              set({ allDevices: updatedDevices });
            }
            break;
          }

          case 'collaborator_revoked': {
            // Update device collaborations count
            const { allDevices } = get();
            const deviceIndex = allDevices.findIndex(d => d.id === data.device_id);

            if (deviceIndex !== -1) {
              const updatedDevices = [...allDevices];
              const currentCollab = updatedDevices[deviceIndex].collaborations_count || 0;
              updatedDevices[deviceIndex] = {
                ...updatedDevices[deviceIndex],
                collaborations_count: Math.max(0, currentCollab - 1)
              };
              set({ allDevices: updatedDevices });
            }
            break;
          }

          case 'sensor_data': {
            // Update device last_seen timestamp when new sensor data arrives
            const { allDevices } = get();
            const deviceIndex = allDevices.findIndex(
              d => d.id === data.device_id || d.device_serial === data.device_serial
            );

            if (deviceIndex !== -1) {
              const updatedDevices = [...allDevices];
              updatedDevices[deviceIndex] = {
                ...updatedDevices[deviceIndex],
                last_seen: data.timestamp || new Date().toISOString()
              };
              set({ allDevices: updatedDevices });
            }
            break;
          }

          case 'reservoir_update': {
            // Update device reservoir status
            const { allDevices } = get();
            const deviceIndex = allDevices.findIndex(
              d => d.id === data.device_id || d.device_serial === data.device_serial
            );

            if (deviceIndex !== -1) {
              const updatedDevices = [...allDevices];
              updatedDevices[deviceIndex] = {
                ...updatedDevices[deviceIndex],
                last_seen: data.timestamp || new Date().toISOString()
              };
              set({ allDevices: updatedDevices });
            }
            break;
          }

          case 'user_created': {
            // Add new user to allUsers
            const { allUsers, adminStats } = get();
            const exists = allUsers.some(u => u.id === data.user_id || u.email === data.email);
            if (!exists) {
              set({
                allUsers: [...allUsers, {
                  id: data.user_id,
                  name: data.name || data.email,
                  email: data.email,
                  device_count: 0,
                  last_active: data.timestamp || 'Never',
                  is_active: true,
                  is_staff: data.is_staff || false
                }],
                // Optimistically update stats
                adminStats: adminStats ? {
                  ...adminStats,
                  summary: {
                    ...adminStats.summary,
                    users: {
                      ...adminStats.summary.users,
                      active: (adminStats.summary.users?.active || 0) + 1
                    }
                  }
                } : adminStats
              });
            }
            break;
          }

          case 'user_device_count_changed': {
            // Update user's device count when they bind/unbind devices
            const { allUsers } = get();
            const userIndex = allUsers.findIndex(u => u.id === data.user_id || u.email === data.email);

            if (userIndex !== -1) {
              const updatedUsers = [...allUsers];
              updatedUsers[userIndex] = {
                ...updatedUsers[userIndex],
                device_count: data.device_count,
                last_active: data.timestamp || updatedUsers[userIndex].last_active
              };
              set({ allUsers: updatedUsers });
            }
            break;
          }

          default:
            console.log('[AdminStore] Unhandled action:', action);
        }
      },

      /**
       * Connect to WebSocket and subscribe to admin updates
       */
      connectAdminWS: () => {
        // Initiate connection to global devices stream
        wsClient.connect(null);

        // Subscribe to messages
        const unsubscribeMessages = wsClient.subscribe((update) => {
          console.log('[AdminStore] WebSocket update:', update);

          if (!update) return;

          // New typed message family (e.g., 'sensor.update', 'admin.*')
          if (update.type) {
            if (typeof update.type === 'string' && update.type.startsWith('admin.')) {
              get().handleAdminUpdate(update);
              return;
            }
            if (update.type === 'sensor.update') {
              const { device_id, device_serial, timestamp } = update;
              get().applyAdminUpdate({
                action: 'sensor_data',
                data: { device_id, device_serial, timestamp }
              });
              return;
            }
          }

          // Legacy action-based broadcast
          get().applyAdminUpdate(update);
        });

        // Track connection status
        const unsubscribeStatus = wsClient.onStatusChange((status) => {
          set({ wsStatus: status });
        });

        // Return cleanup function
        return () => {
          unsubscribeMessages();
          unsubscribeStatus();
        };
      },

      /**
       * Handle new admin.* WebSocket messages
       */
      handleAdminUpdate: (message) => {
        const { type, data, timestamp } = message;

        switch (type) {
          case 'admin.device_created': {
            const { allDevices, adminStats } = get();
            const exists = allDevices.some(d => d.id === data.id);
            if (!exists) {
              set({
                allDevices: [data, ...allDevices],
                adminStats: adminStats ? {
                  ...adminStats,
                  summary: {
                    ...adminStats.summary,
                    devices: {
                      ...adminStats.summary.devices,
                      total: (adminStats.summary.devices?.total || 0) + 1,
                      available: data.is_bound ? adminStats.summary.devices?.available || 0 : (adminStats.summary.devices?.available || 0) + 1,
                      bound: data.is_bound ? (adminStats.summary.devices?.bound || 0) + 1 : adminStats.summary.devices?.bound || 0,
                    }
                  }
                } : adminStats
              });
            }
            break;
          }

          case 'admin.device_updated': {
            const { allDevices } = get();
            const deviceIndex = allDevices.findIndex(d => d.id === data.id);
            if (deviceIndex !== -1) {
              const updatedDevices = [...allDevices];
              updatedDevices[deviceIndex] = {
                ...updatedDevices[deviceIndex],
                ...data,
                updated_at: timestamp || data.updated_at
              };
              set({ allDevices: updatedDevices });
            } else {
              // Device not in list, add it (edge case)
              set({ allDevices: [data, ...allDevices] });
            }
            break;
          }

          case 'admin.device_deleted': {
            const { allDevices, adminStats } = get();
            const deviceIndex = allDevices.findIndex(d => d.id === data.id);
            if (deviceIndex !== -1) {
              const deletedDevice = allDevices[deviceIndex];
              const updatedDevices = allDevices.filter(d => d.id !== data.id);

              set({
                allDevices: updatedDevices,
                adminStats: adminStats ? {
                  ...adminStats,
                  summary: {
                    ...adminStats.summary,
                    devices: {
                      ...adminStats.summary.devices,
                      total: Math.max(0, (adminStats.summary.devices?.total || 0) - 1),
                      available: deletedDevice.is_bound ? adminStats.summary.devices?.available || 0 : Math.max(0, (adminStats.summary.devices?.available || 0) - 1),
                      bound: deletedDevice.is_bound ? Math.max(0, (adminStats.summary.devices?.bound || 0) - 1) : adminStats.summary.devices?.bound || 0,
                    }
                  }
                } : adminStats
              });
            }
            break;
          }

          case 'admin.user_created': {
            const { allUsers, adminStats } = get();
            const exists = allUsers.some(u => u.id === data.id);
            if (!exists) {
              set({
                allUsers: [data, ...allUsers],
                adminStats: adminStats ? {
                  ...adminStats,
                  summary: {
                    ...adminStats.summary,
                    users: {
                      ...adminStats.summary.users,
                      active: (adminStats.summary.users?.active || 0) + 1,
                      total: (adminStats.summary.users?.total || 0) + 1,
                    }
                  }
                } : adminStats
              });
            }
            break;
          }

          case 'admin.user_updated': {
            const { allUsers } = get();
            const userIndex = allUsers.findIndex(u => u.id === data.id);
            if (userIndex !== -1) {
              const updatedUsers = [...allUsers];
              updatedUsers[userIndex] = {
                ...updatedUsers[userIndex],
                ...data
              };
              set({ allUsers: updatedUsers });
            } else {
              // User not in list, add it (edge case)
              set({ allUsers: [data, ...allUsers] });
            }
            break;
          }

          case 'admin.user_deleted': {
            const { allUsers, adminStats } = get();
            const userIndex = allUsers.findIndex(u => u.id === data.id);
            if (userIndex !== -1) {
              const updatedUsers = allUsers.filter(u => u.id !== data.id);

              set({
                allUsers: updatedUsers,
                adminStats: adminStats ? {
                  ...adminStats,
                  summary: {
                    ...adminStats.summary,
                    users: {
                      ...adminStats.summary.users,
                      total: Math.max(0, (adminStats.summary.users?.total || 0) - 1),
                      active: Math.max(0, (adminStats.summary.users?.active || 0) - 1),
                    }
                  }
                } : adminStats
              });
            }
            break;
          }

          default:
            console.log('[AdminStore] Unhandled admin message type:', type);
        }
      },

      /**
       * Update WebSocket connection status
       */
      setWsStatus: (status) => {
        set({ wsStatus: status });
      }
    }),
    {
      name: 'admin-realtime-store',
      partialize: (state) => ({
        // Persist data but not loading/error states
        adminStats: state.adminStats,
        allDevices: state.allDevices,
        allUsers: state.allUsers
      })
    }
  )
);

export default useAdminRealtimeStore;
