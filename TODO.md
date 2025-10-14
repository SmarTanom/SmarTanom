# Add Trash Button to Admin Users Page

## Backend Changes
- [ ] Add `delete_user` API endpoint in `backend/apps/accounts/views.py`
  - Create view function similar to `safe_delete_users` in admin.py
  - Handle cleanup of related data (tokens, logs, OTPs, etc.)
  - Add proper permissions (admin only)
- [ ] Add URL pattern in `backend/apps/accounts/urls.py` for the delete endpoint

## Frontend Changes
- [ ] Add `deleteUser` function to `frontend/src/services/api/admin.js`
  - Make API call to new backend endpoint
  - Handle success/error responses
- [ ] Modify `frontend/src/pages/AdminUsers.jsx`
  - Import Trash icon from lucide-react
  - Add state for delete confirmation modal
  - Add trash button to each user card (except staff users)
  - Implement delete confirmation logic with dynamic messages:
    - Users with no devices: "This user has no devices. Deleting will permanently remove their account."
    - Users with devices: "This user has X device(s). Deleting will permanently remove their account and all associated devices."
    - Active users: Add "This user is currently active." to message
    - Inactive users: Add "This user is inactive." to message
  - Handle delete confirmation and API call
  - Update UI after successful deletion (remove user from list)
  - Show error messages on failure

## Testing
- [ ] Test deletion of users with different statuses:
  - User with no devices (inactive/active)
  - User with devices (inactive/active)
  - Ensure staff users don't show trash button
- [ ] Verify proper error handling for API failures
- [ ] Confirm related data cleanup in backend
