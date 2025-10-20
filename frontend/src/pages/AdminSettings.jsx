import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../assets/styles/AdminLayout.css';
import '../assets/styles/AdminSettings.css';
import AdminNavbar from '../components/admin/AdminNavbar';
import { getAdminProfile, updateAdminProfile, updateAdminPreferences } from '../services/api/admin';
import {
	isPushNotificationSupported,
	subscribeToPush,
	unsubscribeFromPush,
} from '../services/api/notifications';
import ConfirmModal from '../components/ui/ConfirmModal.jsx';
import {
	User,
	Shield,
	Bell,
	Palette,
	Sun,
	Moon,
	HelpCircle,
	LogOut,
	Loader2,
	CheckCircle2,
	AlertCircle,
	Edit2,
	X,
	Home,
	ExternalLink
} from 'lucide-react';

function AdminSettings() {
	const navigate = useNavigate();
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [saveMessage, setSaveMessage] = useState(null);

	// User data
	const [email, setEmail] = useState('');
	const [firstName, setFirstName] = useState('');
	const [lastName, setLastName] = useState('');

	// Edit mode state
	const [isEditing, setIsEditing] = useState(false);
	const [originalFirstName, setOriginalFirstName] = useState('');
	const [originalLastName, setOriginalLastName] = useState('');

	// Logout modal
	const [showLogoutModal, setShowLogoutModal] = useState(false);

	// Preferences
	const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
	const [emailNotifications, setEmailNotifications] = useState(true);
	const [pushNotifications, setPushNotifications] = useState(true);
	const [deviceAlerts, setDeviceAlerts] = useState(true);
	const [systemUpdates, setSystemUpdates] = useState(false);
	const [weeklyReports, setWeeklyReports] = useState(true);
	const [darkMode, setDarkMode] = useState(() => {
		const saved = localStorage.getItem('darkMode');
		return saved ? JSON.parse(saved) : false;
	});
	const [sessionTimeout, setSessionTimeout] = useState('30');
	const [fontSize, setFontSize] = useState(() => {
		return localStorage.getItem('fontSize') || 'medium';
	});

	// Fetch profile on mount
	useEffect(() => {
		const fetchProfile = async () => {
			try {
				const data = await getAdminProfile();

				// Set user data
				setEmail(data.user.email);
				setFirstName(data.user.first_name || '');
				setLastName(data.user.last_name || '');
				setOriginalFirstName(data.user.first_name || '');
				setOriginalLastName(data.user.last_name || '');

				// Set preferences
				setEmailNotifications(data.preferences.email_notifications);
				setPushNotifications(data.preferences.push_notifications ?? true); // Fallback to true if undefined
				setDeviceAlerts(data.preferences.device_alerts);
				setSystemUpdates(data.preferences.system_updates);
				setWeeklyReports(data.preferences.weekly_reports);
				setTwoFactorEnabled(data.preferences.two_factor_enabled);
				setSessionTimeout(String(data.preferences.session_timeout));

				// Sync dark mode and font size with localStorage
				const savedDarkMode = data.preferences.dark_mode;
				setDarkMode(savedDarkMode);
				localStorage.setItem('darkMode', JSON.stringify(savedDarkMode));

				const savedFontSize = data.preferences.font_size;
				setFontSize(savedFontSize);
				localStorage.setItem('fontSize', savedFontSize);

			} catch (error) {
				console.error('Failed to fetch profile:', error);
				showMessage('Failed to load settings', 'error');
			} finally {
				setLoading(false);
			}
		};

		fetchProfile();
	}, []);

	// Apply dark mode theme to document root
	useEffect(() => {
		const root = document.documentElement;
		if (darkMode) {
			root.setAttribute('data-theme', 'dark');
		} else {
			root.removeAttribute('data-theme');
		}
	}, [darkMode]);

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
		setIsEditing(false);
	};

	const handleSaveProfile = async () => {
		setSaving(true);
		try {
			await updateAdminProfile({
				first_name: firstName,
				last_name: lastName
			});
			setOriginalFirstName(firstName);
			setOriginalLastName(lastName);
			setIsEditing(false);
			showMessage('Profile updated successfully', 'success');
		} catch (error) {
			const errorMsg = error.response?.data?.error || 'Failed to update profile';
			showMessage(errorMsg, 'error');
		} finally {
			setSaving(false);
		}
	};

	const handlePreferenceChange = async (key, value) => {
		console.log(`🔄 Updating preference: ${key} = ${value}`);
		try {
			const response = await updateAdminPreferences({ [key]: value });
			console.log(`✅ Preference saved: ${key} = ${value}`, response);
			showMessage('Settings saved', 'success');
		} catch (error) {
			console.error(`❌ Failed to save preference ${key}:`, error);
			showMessage('Failed to save settings', 'error');
		}
	};

	const handleDarkModeChange = async (value) => {
		console.log(`🌓 Changing dark mode to: ${value}`);
		setDarkMode(value);
		localStorage.setItem('darkMode', JSON.stringify(value));
		await handlePreferenceChange('dark_mode', value);
	};

	const handleFontSizeChange = async (value) => {
		console.log(`🔤 Changing font size to: ${value}`);
		setFontSize(value);
		localStorage.setItem('fontSize', value);
		await handlePreferenceChange('font_size', value);
	};

	const openLogoutModal = () => setShowLogoutModal(true);
	const closeLogoutModal = () => setShowLogoutModal(false);

	const confirmLogout = () => {
		localStorage.removeItem('authToken');
		localStorage.removeItem('userEmail');
		setShowLogoutModal(false);
		navigate('/login');
		window.location.reload();
	};

	return (
	<div className="admin-root">
		<AdminNavbar activePage="settings" />

		{loading ? (
			<main className="admin-main" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
				<div style={{ textAlign: 'center' }}>
					<Loader2 size={48} className="spinner" style={{ color: '#339432' }} />
					<p style={{ marginTop: '16px', color: '#6f8876' }}>Loading settings...</p>
				</div>
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

							<div className="settings-group">
								<label className="setting-label">Email Address</label>
								<div className="email-display">{email || 'Loading...'}</div>
								<p className="setting-help">Email address is managed through authentication</p>
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

					{/* Security */}
					<section className="settings-card">
						<div className="card-header">
							<Shield size={20} className="card-icon green" />
							<h2 className="card-title">Security</h2>
						</div>

						<div className="setting-row">
							<div className="setting-info">
								<div className="setting-label">Two-Factor Authentication</div>
								<div className="setting-description">Add an extra layer of security</div>
							</div>
							<label className="toggle-switch">
								<input
									type="checkbox"
									checked={twoFactorEnabled}
									onChange={async (e) => {
										const newValue = e.target.checked;
										setTwoFactorEnabled(newValue);
										await handlePreferenceChange('two_factor_enabled', newValue);
									}}
								/>
								<span className="toggle-slider"></span>
							</label>
						</div>

						<div className="setting-row">
							<div className="setting-info">
								<div className="setting-label">Session Timeout</div>
								<div className="setting-description">Auto-logout after inactivity</div>
							</div>
							<select
								className="setting-select"
								value={sessionTimeout}
								onChange={async (e) => {
									const newValue = e.target.value;
									setSessionTimeout(newValue);
									await handlePreferenceChange('session_timeout', newValue);
								}}
							>
								<option value="15">15 min</option>
								<option value="30">30 min</option>
								<option value="60">60 min</option>
								<option value="120">2 hours</option>
							</select>
						</div>

						<p className="security-note">
							Authentication is managed through email OTP. Session settings apply after next login.
						</p>
					</section>

					{/* Notifications */}
					<section className="settings-card">
						<div className="card-header">
							<Bell size={20} className="card-icon green" />
							<h2 className="card-title">Notifications</h2>
						</div>

						<div className="setting-row">
							<div className="setting-info">
								<div className="setting-label">Email Notifications</div>
								<div className="setting-description">Receive alerts via email</div>
							</div>
							<label className="toggle-switch">
								<input
									type="checkbox"
									checked={emailNotifications}
									onChange={async (e) => {
										const newValue = e.target.checked;
										setEmailNotifications(newValue);
										await handlePreferenceChange('email_notifications', newValue);
									}}
								/>
								<span className="toggle-slider"></span>
							</label>
						</div>

						<div className="setting-row">
							<div className="setting-info">
								<div className="setting-label">Push Notifications</div>
								<div className="setting-description">Receive browser push notifications</div>
							</div>
							<label className="toggle-switch">
								<input
									type="checkbox"
									checked={pushNotifications}
									onChange={async (e) => {
										const newValue = e.target.checked;
										setPushNotifications(newValue);
										try {
											// Ensure browser supports push notifications
											if (!isPushNotificationSupported()) {
												throw new Error('Push notifications are not supported in this browser');
											}

											if (newValue) {
												// Enable: subscribe in browser and create backend PushSubscription
												await subscribeToPush();
												await handlePreferenceChange('push_notifications', true);
												showMessage('Push notifications enabled on this device', 'success');
											} else {
												// Disable: unsubscribe in browser and deactivate backend record
												await unsubscribeFromPush();
												await handlePreferenceChange('push_notifications', false);
												showMessage('Push notifications disabled for this device', 'success');
											}
										} catch (err) {
											console.error('❌ Failed to toggle push notifications:', err);
											// Revert UI toggle on failure
											setPushNotifications((prev) => !prev);
											showMessage(
												typeof err?.message === 'string' ? err.message : 'Failed to update push notifications',
												'error'
											);
										}
									}}
								/>
								<span className="toggle-slider"></span>
							</label>
						</div>

						<div className="setting-row">
							<div className="setting-info">
								<div className="setting-label">Device Alerts</div>
								<div className="setting-description">Critical device status changes from all devices</div>
							</div>
							<label className="toggle-switch">
								<input
									type="checkbox"
									checked={deviceAlerts}
									onChange={async (e) => {
										const newValue = e.target.checked;
										setDeviceAlerts(newValue);
										await handlePreferenceChange('device_alerts', newValue);
									}}
								/>
								<span className="toggle-slider"></span>
							</label>
						</div>

						<div className="setting-row">
							<div className="setting-info">
								<div className="setting-label">System Updates</div>
								<div className="setting-description">New features and maintenance</div>
							</div>
							<label className="toggle-switch">
								<input
									type="checkbox"
									checked={systemUpdates}
									onChange={async (e) => {
										const newValue = e.target.checked;
										setSystemUpdates(newValue);
										await handlePreferenceChange('system_updates', newValue);
									}}
								/>
								<span className="toggle-slider"></span>
							</label>
						</div>

						<div className="setting-row">
							<div className="setting-info">
								<div className="setting-label">Weekly Reports</div>
								<div className="setting-description">Summary of system activity</div>
							</div>
							<label className="toggle-switch">
								<input
									type="checkbox"
									checked={weeklyReports}
									onChange={async (e) => {
										const newValue = e.target.checked;
										setWeeklyReports(newValue);
										await handlePreferenceChange('weekly_reports', newValue);
									}}
								/>
								<span className="toggle-slider"></span>
							</label>
						</div>
					</section>

					{/* Appearance */}
					<section className="settings-card">
						<div className="card-header">
							<Palette size={20} className="card-icon green" />
							<h2 className="card-title">Appearance</h2>
						</div>

						<div className="setting-row">
							<div className="setting-info">
								<div className="setting-label">Dark Mode</div>
								<div className="setting-description">Switch between light and dark theme</div>
							</div>
							<div className="theme-toggle">
								<button
									className={`theme-btn ${!darkMode ? 'active' : ''}`}
									onClick={() => handleDarkModeChange(false)}
								>
									<Sun size={16} />
								</button>
								<button
									className={`theme-btn ${darkMode ? 'active' : ''}`}
									onClick={() => handleDarkModeChange(true)}
								>
									<Moon size={16} />
								</button>
							</div>
						</div>

						<div className="setting-row">
							<div className="setting-info">
								<div className="setting-label">Font Size</div>
								<div className="setting-description">Adjust text size for better readability</div>
							</div>
							<select
								className="setting-select"
								value={fontSize}
								onChange={(e) => handleFontSizeChange(e.target.value)}
							>
								<option value="small">Small</option>
								<option value="medium">Medium</option>
								<option value="large">Large</option>
							</select>
						</div>
					</section>
				</div>

				{/* Support & Help */}
				<section className="settings-card support-card">
					<div className="card-header">
						<HelpCircle size={20} className="card-icon green" />
						<h2 className="card-title">Support & Help</h2>
					</div>

					<div className="support-buttons">
						<button className="support-btn">Documentation</button>
						<button className="support-btn">Contact Support</button>
						<button className="support-btn">Video Tutorials</button>
						<button className="support-btn">FAQ</button>
					</div>
				</section>

				{/* Quick Access */}
				<section className="settings-card quick-access-card">
					<div className="card-header">
						<Home size={20} className="card-icon green" />
						<h2 className="card-title">Quick Access</h2>
					</div>

					<button 
						className="user-dashboard-link"
						onClick={() => navigate('/dashboard')}
					>
						<div className="link-content">
							<div className="link-icon">
								<Home size={18} />
							</div>
							<div className="link-info">
								<div className="link-label">User Dashboard</div>
								<div className="link-description">View your personal monitoring dashboard</div>
							</div>
						</div>
						<ExternalLink size={16} className="link-arrow" />
					</button>
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
		</div>
	);
}

export default AdminSettings;
