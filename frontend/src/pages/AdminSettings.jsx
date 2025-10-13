import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../assets/styles/AdminSettings.css';
import logoMarkWhite from '../assets/images/logo-mark-white.png';
import {
	LayoutDashboard,
	Boxes,
	Plus,
	Users,
	Settings,
	User,
	Shield,
	Bell,
	Palette,
	Sun,
	Moon,
	HelpCircle,
	LogOut
} from 'lucide-react';

function AdminSettings() {
	const navigate = useNavigate();
	const [twoFactorEnabled, setTwoFactorEnabled] = useState(true);
	const [emailNotifications, setEmailNotifications] = useState(true);
	const [deviceAlerts, setDeviceAlerts] = useState(true);
	const [systemUpdates, setSystemUpdates] = useState(false);
	const [weeklyReports, setWeeklyReports] = useState(true);
	const [darkMode, setDarkMode] = useState(false);
	const [sessionTimeout, setSessionTimeout] = useState('30');
	const [fontSize, setFontSize] = useState('Medium');

	const handleLogout = () => {
		// Placeholder for logout functionality
		alert('Logout functionality will be implemented');
	};

	return (
		<div className="admin-root">
			{/* Sidebar navigation (desktop) */}
			<aside className="admin-sidebar" aria-label="Admin sidebar">
				<div className="brand-logo">
					<div className="logo-mark">
						<img src={logoMarkWhite} alt="SmarTanom" />
					</div>
					<div className="brand-text">
						<div className="brand-name">SmarTanom</div>
						<div className="brand-subtitle">Dashboard</div>
					</div>
				</div>
				<div className="side-nav-label">MENU</div>
				<nav className="side-nav">
					<button className="side-link" onClick={() => navigate('/admin')}>
						<LayoutDashboard size={18} />
						<span>Dashboard</span>
					</button>
					<button className="side-link" onClick={() => navigate('/admin/devices')}>
						<Boxes size={18} />
						<span>Devices</span>
					</button>
					<button className="side-link" onClick={() => navigate('/admin/create')}>
						<Plus size={18} />
						<span>Create</span>
					</button>
					<button className="side-link" onClick={() => navigate('/admin/users')}>
						<Users size={18} />
						<span>Users</span>
					</button>
					<button className="side-link active" onClick={() => navigate('/admin/settings')}>
						<Settings size={18} />
						<span>Settings</span>
					</button>
				</nav>
				<div className="system-status">
					<span className="status-dot online" />
					<div>
						<div className="status-title">System Online</div>
						<div className="status-sub">All services operational</div>
					</div>
				</div>
			</aside>

			{/* Main content */}
			<main className="admin-main">
				<header className="settings-header">
					<div>
						<h1 className="settings-title">Settings</h1>
						<p className="settings-subtitle">Manage your account and system preferences</p>
					</div>
				</header>

				<div className="settings-grid">
					{/* Account Settings */}
					<section className="settings-card">
						<div className="card-header">
							<User size={20} className="card-icon" />
							<h2 className="card-title">Account Settings</h2>
						</div>

						<div className="settings-group">
							<label className="setting-label">Email Address</label>
							<div className="email-display">adm***@smartanom.com</div>
							<p className="setting-help">Email address is managed through OAuth authentication</p>
						</div>

						<button className="btn-update-profile">Update Profile</button>
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
									onChange={(e) => setTwoFactorEnabled(e.target.checked)}
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
								onChange={(e) => setSessionTimeout(e.target.value)}
							>
								<option value="15">15 min</option>
								<option value="30">30 min</option>
								<option value="60">60 min</option>
								<option value="120">2 hours</option>
							</select>
						</div>

						<p className="security-note">
							Authentication is managed through OAuth. Password changes are handled by your OAuth provider.
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
									onChange={(e) => setEmailNotifications(e.target.checked)}
								/>
								<span className="toggle-slider"></span>
							</label>
						</div>

						<div className="setting-row">
							<div className="setting-info">
								<div className="setting-label">Device Alerts</div>
								<div className="setting-description">Critical device status changes</div>
							</div>
							<label className="toggle-switch">
								<input
									type="checkbox"
									checked={deviceAlerts}
									onChange={(e) => setDeviceAlerts(e.target.checked)}
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
									onChange={(e) => setSystemUpdates(e.target.checked)}
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
									onChange={(e) => setWeeklyReports(e.target.checked)}
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
									onClick={() => setDarkMode(false)}
								>
									<Sun size={16} />
								</button>
								<button
									className={`theme-btn ${darkMode ? 'active' : ''}`}
									onClick={() => setDarkMode(true)}
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
								onChange={(e) => setFontSize(e.target.value)}
							>
								<option value="Small">Small</option>
								<option value="Medium">Medium</option>
								<option value="Large">Large</option>
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

				{/* Logout */}
				<section className="settings-card logout-card">
					<button className="btn-logout" onClick={handleLogout}>
						<LogOut size={20} />
						Logout
					</button>
				</section>
			</main>

			{/* Bottom navigation (mobile) */}
			<nav className="admin-bottom-nav" aria-label="Admin primary">
				<button className="bn-item" onClick={() => navigate('/admin')}>
					<LayoutDashboard size={20} />
					<span>Dashboard</span>
				</button>
				<button className="bn-item" onClick={() => navigate('/admin/devices')}>
					<Boxes size={20} />
					<span>Devices</span>
				</button>
				<button className="bn-item" onClick={() => navigate('/admin/create')}>
					<Plus size={20} />
					<span>Add</span>
				</button>
				<button className="bn-item" onClick={() => navigate('/admin/users')}>
					<Users size={20} />
					<span>Users</span>
				</button>
				<button className="bn-item active" onClick={() => navigate('/admin/settings')}>
					<Settings size={20} />
					<span>Settings</span>
				</button>
			</nav>
		</div>
	);
}

export default AdminSettings;
