import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../assets/styles/AdminLayout.css';
import '../assets/styles/AdminSettings.css';
import AdminNavbar from '../components/admin/AdminNavbar';
import { getAdminProfile, updateAdminProfile } from '../services/api/admin';
import ConfirmModal from '../components/ui/ConfirmModal.jsx';
import GlobalLoadingSpinner from '../components/ui/GlobalLoadingSpinner.jsx';
import {
	User,
	HelpCircle,
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
	const [firstName, setFirstName] = useState('');
	const [lastName, setLastName] = useState('');

	// Edit mode state
	const [isEditing, setIsEditing] = useState(false);
	const [originalFirstName, setOriginalFirstName] = useState('');
	const [originalLastName, setOriginalLastName] = useState('');

	// Logout modal
	const [showLogoutModal, setShowLogoutModal] = useState(false);

	// Preferences
	// No notifications-related preferences retained

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

	// No notifications-related preference handler

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

					{/* Communication section removed per request (push/email notifications not used) */}
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
