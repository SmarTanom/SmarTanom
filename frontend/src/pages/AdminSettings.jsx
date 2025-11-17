import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../assets/styles/AdminLayout.css';
import '../assets/styles/AdminSettings.css';
import AdminNavbar from '../components/admin/AdminNavbar';
// import { getAdminProfile } from '../services/api/admin';
import { authApi, apiClient } from '../services/apiClient.js';
import ConfirmModal from '../components/ui/ConfirmModal.jsx';
import GlobalLoadingSpinner from '../components/ui/GlobalLoadingSpinner.jsx';
import {
	User,
	LogOut,
	Loader2,
	CheckCircle2,
	AlertCircle,
	Edit2,
	X
} from 'lucide-react';

function AdminSettings() {
	const navigate = useNavigate();
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [saveMessage, setSaveMessage] = useState(null);

	// User data
	const [email, setEmail] = useState('');
	const [username, setUsername] = useState('');
	const [firstName, setFirstName] = useState('');
	const [lastName, setLastName] = useState('');
	const [photoUrl, setPhotoUrl] = useState(null);
	const [newPhotoFile, setNewPhotoFile] = useState(null);
	const [photoPreview, setPhotoPreview] = useState('');

	// Edit mode state
	const [isEditing, setIsEditing] = useState(false);
	const [originalFirstName, setOriginalFirstName] = useState('');
	const [originalLastName, setOriginalLastName] = useState('');
	const [originalUsername, setOriginalUsername] = useState('');

	// Logout modal
	const [showLogoutModal, setShowLogoutModal] = useState(false);
	const [showClearCacheModal, setShowClearCacheModal] = useState(false);

	// Health & maintenance
	const [health, setHealth] = useState(null);
	const [checkingHealth, setCheckingHealth] = useState(false);
	const [maintaining, setMaintaining] = useState(false);

	// Preferences
	// No notifications-related preferences retained

	// Fetch profile on mount
	useEffect(() => {
		const fetchProfile = async () => {
			try {
				// Prefer the general profile endpoint so avatar/username updates are supported
				const token = localStorage.getItem('authToken');
				const prof = await authApi.getProfile(token);

				setEmail(prof.email);
				setUsername(prof.username || (prof.email ? prof.email.split('@')[0] : 'User'));
				setFirstName(prof.first_name || '');
				setLastName(prof.last_name || '');
				setPhotoUrl(prof.user_photo_url || null);
				setOriginalFirstName(prof.first_name || '');
				setOriginalLastName(prof.last_name || '');
				setOriginalUsername(prof.username || (prof.email ? prof.email.split('@')[0] : 'User'));

				// Preferences used in this page
				// No notifications-related preferences used

			} catch (error) {
				console.error('Failed to fetch profile:', error);
				showMessage('Failed to load settings', 'error');
			} finally {
				setLoading(false);
			}
		};

		fetchProfile();

		// Initial health check
		checkHealth();
	}, []);

	const showMessage = (message, type = 'success') => {
		setSaveMessage({ message, type });
		setTimeout(() => setSaveMessage(null), 3000);
	};

	const handleEditClick = () => {
		setIsEditing(true);
	};

	const handleCancelEdit = () => {
		setFirstName(originalFirstName);
		setLastName(originalLastName);
		setUsername(originalUsername);
		setIsEditing(false);
		if (photoPreview) URL.revokeObjectURL(photoPreview);
		setPhotoPreview('');
		setNewPhotoFile(null);
	};

	const handleSaveProfile = async () => {
		setSaving(true);
		try {
			const token = localStorage.getItem('authToken');
			let payload;
			if (newPhotoFile) {
				payload = new FormData();
				payload.append('first_name', firstName || '');
				payload.append('last_name', lastName || '');
				payload.append('username', (username || '').trim());
				payload.append('user_photo', newPhotoFile);
			} else {
				payload = {
					first_name: firstName || '',
					last_name: lastName || '',
					username: (username || '').trim(),
				};
			}
			const updated = await authApi.updateProfile(token, payload);
			setOriginalFirstName(updated.first_name || '');
			setOriginalLastName(updated.last_name || '');
			setOriginalUsername(updated.username || (updated.email ? updated.email.split('@')[0] : 'User'));
			setPhotoUrl(updated.user_photo_url || photoUrl);
			setIsEditing(false);
			if (photoPreview) URL.revokeObjectURL(photoPreview);
			setPhotoPreview('');
			setNewPhotoFile(null);
			showMessage('Profile updated successfully', 'success');
		} catch (error) {
			const errorMsg = error?.message || 'Failed to update profile';
			showMessage(errorMsg, 'error');
		} finally {
			setSaving(false);
		}
	};

	const onPickPhoto = (e) => {
		const f = e.target.files && e.target.files[0];
		if (!f) return;
		if (photoPreview) URL.revokeObjectURL(photoPreview);
		const url = URL.createObjectURL(f);
		setNewPhotoFile(f);
		setPhotoPreview(url);
	};

	// No notifications-related preference handler

	const openLogoutModal = () => setShowLogoutModal(true);
	const closeLogoutModal = () => setShowLogoutModal(false);

	const confirmLogout = async () => {
		try {
			const token = localStorage.getItem('authToken');
			await authApi.logout(token);
		} catch (e) {
			// non-fatal
		}
		try { localStorage.removeItem('authToken'); } catch (_) {}
		try { localStorage.removeItem('userEmail'); } catch (_) {}
		setShowLogoutModal(false);
		navigate('/login');
		window.location.reload();
	};

	const clearLocalCache = async () => {
		try { localStorage.clear(); } catch (_) {}
		try { sessionStorage.clear(); } catch (_) {}
		try {
			if ('caches' in window) {
				const keys = await caches.keys();
				await Promise.all(keys.map(k => caches.delete(k)));
			}
		} catch (_) {}
		// Preserve current path to return after reload if needed
		window.location.reload();
	};

	const checkHealth = async () => {
		setCheckingHealth(true);
		try {
			const data = await apiClient.get('/api/health/');
			setHealth({ status: data?.status || 'unknown', db: data?.db ?? false });
		} catch (e) {
			setHealth({ status: 'unknown', db: false });
		} finally {
			setCheckingHealth(false);
		}
	};

	const cleanupOtps = async () => {
		setMaintaining(true);
		try {
			const token = localStorage.getItem('authToken');
			const res = await apiClient.post('/api/auth/cleanup/otps/', {}, { authToken: token });
			showMessage(res?.message || 'Cleanup completed', 'success');
		} catch (e) {
			showMessage(e?.message || 'Cleanup failed', 'error');
		} finally {
			setMaintaining(false);
		}
	};

	return (
	<div className="admin-root">
		<AdminNavbar activePage="settings" />

		{loading ? (
			<main className="admin-main" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
				<GlobalLoadingSpinner message="Loading settings..." />
			</main>
		) : (
			<main className="admin-main">
				<header className="settings-header">
					<div>
						<h1 className="settings-title">Settings</h1>
						<p className="settings-subtitle">Manage your account and system preferences</p>
					</div>
					{saveMessage && (
						<div className={`save-message ${saveMessage.type}`}>
							{saveMessage.type === 'success' ? (
								<CheckCircle2 size={18} />
							) : (
								<AlertCircle size={18} />
							)}
							<span>{saveMessage.message}</span>
						</div>
					)}
				</header>

				<>
				<div className="settings-grid">
						{/* Account Settings */}
						<section className="settings-card">
							<div className="card-header">
								<User size={20} className="card-icon" />
								<h2 className="card-title">Account Settings</h2>
							</div>

							{/* Avatar */}
							<div className="settings-group" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
								<div style={{ width: 72, height: 72, borderRadius: '50%', overflow: 'hidden', background: '#f3f4f6', border: '1px solid #e5e7eb' }}>
									{(photoPreview || photoUrl) ? (
										<img src={photoPreview || photoUrl} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
									) : (
										<div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>No photo</div>
									)}
								</div>
								{isEditing && (
									<label className="btn-edit-profile" style={{ cursor: 'pointer', margin: 0 }}>
										<Edit2 size={16} />
										<span style={{ marginLeft: 6 }}>Change photo</span>
										<input type="file" accept="image/*" onChange={onPickPhoto} style={{ display: 'none' }} />
									</label>
								)}
							</div>

							<div className="settings-group">
								<label className="setting-label">Email Address</label>
								<div className="email-display">{email || 'Loading...'}</div>
								<p className="setting-help">Email address is managed through authentication</p>
							</div>

							<div className="settings-group">
								<label className="setting-label">Username</label>
								{isEditing ? (
									<input
										type="text"
										className="setting-input"
										value={username}
										onChange={(e) => setUsername(e.target.value)}
										placeholder="Enter username"
									/>
								) : (
									<div className="setting-value">{username || 'Not set'}</div>
								)}
							</div>

							<div className="settings-group">
								<label className="setting-label">First Name</label>
								{isEditing ? (
									<input
										type="text"
										className="setting-input"
										value={firstName}
										onChange={(e) => setFirstName(e.target.value)}
										placeholder="Enter first name"
									/>
								) : (
									<div className="setting-value">{firstName || 'Not set'}</div>
								)}
							</div>

							<div className="settings-group">
								<label className="setting-label">Last Name</label>
								{isEditing ? (
									<input
										type="text"
										className="setting-input"
										value={lastName}
										onChange={(e) => setLastName(e.target.value)}
										placeholder="Enter last name"
									/>
								) : (
									<div className="setting-value">{lastName || 'Not set'}</div>
								)}
							</div>

							{!isEditing ? (
								<button className="btn-edit-profile" onClick={handleEditClick}>
									<Edit2 size={16} />
									Edit Profile
								</button>
							) : (
								<div className="edit-actions">
									<button
										className="btn-save-profile"
										onClick={handleSaveProfile}
										disabled={saving}
									>
										{saving ? (
											<>
												<Loader2 size={16} className="spinner" /> Saving...
											</>
										) : (
											<>
												<CheckCircle2 size={16} /> Save
											</>
										)}
									</button>
									<button className="btn-cancel-profile" onClick={handleCancelEdit} disabled={saving}>
										<X size={16} /> Cancel
									</button>
								</div>
							)}
						</section>

						{/* App Info & Cache (placed beside Account on large screens) */}
						<section className="settings-card">
							<div className="card-header">
								<h2 className="card-title">App Info</h2>
							</div>
							<div className="settings-group">
								<div className="setting-label">API Base URL</div>
								<div className="setting-value" style={{ wordBreak: 'break-all' }}>{apiClient.base}</div>
							</div>
							<div className="settings-group">
								<div className="setting-label">Environment</div>
								<div className="setting-value">{import.meta.env.MODE}</div>
							</div>
							<div className="settings-group">
								<button className="btn-edit-profile" onClick={() => setShowClearCacheModal(true)}>Clear Local Cache</button>
								<p className="setting-help">Clears saved data and PWA caches, then reloads</p>
							</div>
						</section>

						{/* Communication section removed per request (push/email notifications not used) */}
				</div>

				{/* System Health */}
				<section className="settings-card support-card">
					<div className="card-header">
						<h2 className="card-title">System Health</h2>
					</div>
					<div className="setting-row">
						<div className="setting-info">
							<div className="setting-label">API status</div>
							<div className="setting-description">{health ? (health.status === 'ok' ? 'OK' : `Status: ${health.status}`) : 'Checking…'}</div>
						</div>
						<button className="btn-edit-profile" style={{ maxWidth: 180 }} onClick={checkHealth} disabled={checkingHealth}>
							{checkingHealth ? <><Loader2 size={16} className="spinner"/> Checking…</> : 'Refresh'}
						</button>
					</div>
					<div className="setting-row" style={{ borderBottom: 'none' }}>
						<div className="setting-info">
							<div className="setting-label">Database</div>
							<div className="setting-description">{health ? (health.db ? 'Connected' : 'Unavailable') : 'Checking…'}</div>
						</div>
					</div>
				</section>

				{/* Maintenance */}
				<section className="settings-card">
					<div className="card-header">
						<h2 className="card-title">Maintenance</h2>
					</div>
					<div className="setting-row" style={{ borderBottom: 'none' }}>
						<div className="setting-info">
							<div className="setting-label">Cleanup expired OTP codes</div>
							<div className="setting-description">Removes expired OTPs from the database (admin only)</div>
						</div>
						<button className="btn-edit-profile" style={{ maxWidth: 240 }} onClick={cleanupOtps} disabled={maintaining}>
							{maintaining ? <><Loader2 size={16} className="spinner"/> Running…</> : 'Run Cleanup'}
						</button>
					</div>
				</section>



				{/* Logout */}
				<section className="settings-card logout-card">
					<button className="btn-logout" onClick={openLogoutModal}>
						<LogOut size={20} />
						Logout
					</button>
				</section>
				</>
			</main>
		)}

			{/* Logout Confirmation Modal */}
			<ConfirmModal
				isOpen={showLogoutModal}
				title="Sign out"
				description={
					<div>
						<p style={{ margin: 0, color: '#2F3E46' }}>Are you sure you want to sign out?</p>
						<p style={{ margin: '6px 0 0', color: '#6B7D75', fontSize: 14 }}>
							You can sign back in anytime using your email.
						</p>
					</div>
				}
				confirmText="Sign Out"
				cancelText="Cancel"
				onConfirm={confirmLogout}
				onCancel={closeLogoutModal}
				confirmVariant="danger"
			/>

			{/* Clear Cache Confirmation Modal */}
			<ConfirmModal
				isOpen={showClearCacheModal}
				title="Clear local cache?"
				description={
					<div>
						<p style={{ margin: 0, color: '#2F3E46' }}>This will remove localStorage, sessionStorage, and PWA caches.</p>
						<p style={{ margin: '6px 0 0', color: '#6B7D75', fontSize: 14 }}>The app will reload afterwards.</p>
					</div>
				}
				confirmText="Clear & Reload"
				cancelText="Cancel"
				onConfirm={() => { setShowClearCacheModal(false); clearLocalCache(); }}
				onCancel={() => setShowClearCacheModal(false)}
				confirmVariant="danger"
			/>
		</div>
	);
}

export default AdminSettings;
