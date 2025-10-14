import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../assets/styles/AdminLayout.css';
import '../assets/styles/AdminUsers.css';
import logoMarkWhite from '../assets/images/logo-mark-white.png';
import useAdminRealtimeStore from '../store/adminRealtimeStore';
import { wsClient } from '../services/websocketClient';
import { getUserDevices, deleteUser } from '../services/api/admin';
import UserDevicesModal from '../components/ui/UserDevicesModal';
import ConfirmationModal from '../components/ConfirmationModal';
import {
	LayoutDashboard,
	Boxes,
	Plus,
	Users,
	Settings,
	Search,
	Smartphone,
	Activity,
	ChevronRight,
	Loader2,
	AlertTriangle,
	Trash2
} from 'lucide-react';

function AdminUsers() {
	const navigate = useNavigate();
	const [searchQuery, setSearchQuery] = useState('');

	// Modal state
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [selectedUser, setSelectedUser] = useState(null);
	const [userDevices, setUserDevices] = useState([]);
	const [loadingDevices, setLoadingDevices] = useState(false);

	// Delete confirmation modal state
	const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
	const [userToDelete, setUserToDelete] = useState(null);
	const [deletingUser, setDeletingUser] = useState(false);

	// Use admin realtime store
	const users = useAdminRealtimeStore(state => state.allUsers);
	const loading = useAdminRealtimeStore(state => state.loadingUsers);
	const error = useAdminRealtimeStore(state => state.errorUsers);
	const fetchAdminUsers = useAdminRealtimeStore(state => state.fetchAdminUsers);
	const connectAdminWS = useAdminRealtimeStore(state => state.connectAdminWS);

	useEffect(() => {
		// Fetch initial user data
		fetchAdminUsers();

		// Connect to WebSocket for real-time updates
		wsClient.connect();
		const unsubscribeWS = connectAdminWS();

		// Cleanup on unmount
		return () => {
			unsubscribeWS();
		};
	}, [fetchAdminUsers, connectAdminWS]);

	// Helper function to get initials
	const getInitials = (name) => {
		if (!name) return '??';
		const parts = name.split(' ');
		if (parts.length >= 2) {
			return (parts[0][0] + parts[1][0]).toUpperCase();
		}
		return name.slice(0, 2).toUpperCase();
	};

	// Helper function to get background color
	const getBgColor = (index) => {
		const colors = ['#d1fae5', '#e0e7ff', '#fce7f3', '#fef3c7', '#dbeafe'];
		return colors[index % colors.length];
	};

	// Ensure users is always an array before mapping
	const safeUsers = Array.isArray(users) ? users : [];

	// Format users for display
	const formattedUsers = safeUsers.map((user, index) => ({
		id: user.id,
		name: user.name,
		email: user.email,
		initials: getInitials(user.name),
		deviceCount: user.device_count || 0,
		sharedDeviceCount: user.shared_device_count || 0,
		totalDeviceCount: (user.device_count || 0) + (user.shared_device_count || 0),
		lastActive: user.last_active || 'Never',
		bgColor: getBgColor(index),
		is_active: user.is_active,
		is_staff: user.is_staff
	}));

	// Separate admins and regular users
	const adminUsers = formattedUsers.filter(user => user.is_staff);
	const regularUsers = formattedUsers.filter(user => !user.is_staff);

	const totalUsers = formattedUsers.length;
	const totalDevices = formattedUsers.reduce((sum, user) => sum + user.totalDeviceCount, 0);
	const avgPerUser = totalUsers > 0 ? (totalDevices / totalUsers).toFixed(1) : '0.0';

	const totalRegularUsers = regularUsers.length;
	const totalRegularDevices = regularUsers.reduce((sum, user) => sum + user.totalDeviceCount, 0);
	const avgPerRegularUser = totalRegularUsers > 0 ? (totalRegularDevices / totalRegularUsers).toFixed(1) : '0.0';

	const filteredAdmins = adminUsers.filter(user =>
		user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
		user.email.toLowerCase().includes(searchQuery.toLowerCase())
	);

	const filteredRegularUsers = regularUsers.filter(user =>
		user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
		user.email.toLowerCase().includes(searchQuery.toLowerCase())
	);

	// Handle device button click
	const handleViewDevices = async (user) => {
		setSelectedUser(user);
		setIsModalOpen(true);
		setLoadingDevices(true);

		try {
			const response = await getUserDevices(user.id);
			setUserDevices(response.results || []);
		} catch (error) {
			console.error('Error fetching user devices:', error);
			setUserDevices([]);
		} finally {
			setLoadingDevices(false);
		}
	};

	// Handle modal close
	const handleCloseModal = () => {
		setIsModalOpen(false);
		setSelectedUser(null);
		setUserDevices([]);
		setLoadingDevices(false);
	};

	// Handle delete button click
	const handleDeleteClick = (user) => {
		setUserToDelete(user);
		setIsDeleteModalOpen(true);
	};

	// Handle delete confirmation
	const handleDeleteConfirm = async () => {
		if (!userToDelete) return;

		setDeletingUser(true);
		try {
			await deleteUser(userToDelete.id);
			// Refresh the users list after successful deletion
			fetchAdminUsers();
			setIsDeleteModalOpen(false);
			setUserToDelete(null);
		} catch (error) {
			console.error('Error deleting user:', error);
			// Could add error toast here if needed
		} finally {
			setDeletingUser(false);
		}
	};

	// Handle delete modal close
	const handleCloseDeleteModal = () => {
		setIsDeleteModalOpen(false);
		setUserToDelete(null);
	};

	// Generate confirmation message based on user status
	const getDeleteConfirmationMessage = (user) => {
		if (!user) return '';

		let message = '';

		// Device status
		if (user.totalDeviceCount === 0) {
			message += 'This user has no devices. ';
		} else {
			message += `This user has ${user.totalDeviceCount} device${user.totalDeviceCount === 1 ? '' : 's'}. `;
		}

		// Shared devices warning
		if (user.sharedDeviceCount > 0) {
			message += `Shared devices: access revoked on delete. `;
		}

		// Active status
		if (user.is_active) {
			message += 'This user is currently active. ';
		} else {
			message += 'This user is inactive. ';
		}

		message += 'Deleting will permanently remove their account';

		if (user.totalDeviceCount > 0) {
			message += ' and all associated devices';
		}

		message += '. This action cannot be undone.';

		return message;
	};

	// Loading state
	if (loading) {
		return (
			<div className="admin-root">
				<aside className="admin-sidebar" aria-label="Admin sidebar">
					<div className="brand">
						<div className="brand-logo">
							<img src={logoMarkWhite} alt="SmarTanom" />
						</div>
						<div className="brand-text">
							<div className="brand-name">SmarTanom</div>
							<div className="brand-subtitle">Dashboard</div>
						</div>
					</div>
				</aside>
				<main className="admin-main" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
					<div style={{ textAlign: 'center' }}>
						<Loader2 size={48} className="spinner" style={{ color: '#339432' }} />
						<p style={{ marginTop: '16px', color: '#6f8876' }}>Loading users...</p>
					</div>
				</main>
			</div>
		);
	}

	// Error state
	if (error) {
		return (
			<div className="admin-root">
				<aside className="admin-sidebar" aria-label="Admin sidebar">
					<div className="brand">
						<div className="brand-logo">
							<img src={logoMarkWhite} alt="SmarTanom" />
						</div>
						<div className="brand-text">
							<div className="brand-name">SmarTanom</div>
							<div className="brand-subtitle">Dashboard</div>
						</div>
					</div>
				</aside>
				<main className="admin-main" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
					<div style={{ textAlign: 'center', maxWidth: '400px' }}>
						<AlertTriangle size={48} style={{ color: '#ef4444' }} />
						<p style={{ marginTop: '16px', color: '#dc2626', fontWeight: 600 }}>{error}</p>
						<button
							onClick={() => fetchAdminUsers()}
							style={{
								marginTop: '16px',
								padding: '8px 16px',
								background: '#339432',
								color: 'white',
				border: 'none',
								borderRadius: '8px',
								cursor: 'pointer'
							}}
						>
							Retry
						</button>
					</div>
				</main>
			</div>
		);
	}

	return (
		<div className="admin-root">
			{/* Sidebar navigation (desktop) */}
			<aside className="admin-sidebar" aria-label="Admin sidebar">
				<div className="brand">
					<div className="brand-logo">
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
					<button className="side-link active" onClick={() => navigate('/admin/users')}>
						<Users size={18} />
						<span>Users</span>
					</button>
					<button className="side-link" onClick={() => navigate('/admin/settings')}>
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
				<header className="users-header">
					<div>
						<h1 className="users-title">Users</h1>
						<p className="users-subtitle">Manage registered users and their devices</p>
					</div>
				</header>

				{/* Summary cards */}
				<section className="users-summary">
					<div className="users-stat-card">
						<div className="stat-label">TOTAL USERS</div>
						<div className="stat-value">{totalUsers}</div>
					</div>
					<div className="users-stat-card">
						<div className="stat-label">REGULAR USERS</div>
						<div className="stat-value">{totalRegularUsers}</div>
					</div>
					<div className="users-stat-card">
						<div className="stat-label">TOTAL DEVICES</div>
						<div className="stat-value stat-green">{totalDevices}</div>
					</div>
					<div className="users-stat-card">
						<div className="stat-label">AVG PER USER</div>
						<div className="stat-value">{avgPerUser}</div>
					</div>
					<div className="users-stat-card">
						<div className="stat-label">AVG PER REGULAR USER</div>
						<div className="stat-value">{avgPerRegularUser}</div>
					</div>
				</section>

				{/* Search box */}
				<section className="users-search-section">
					<div className="search-box">
						<Search size={20} className="search-icon" />
						<input
							type="text"
							placeholder="Search users by name, email, or device..."
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							className="search-input"
						/>
					</div>
				</section>

				{/* Admins section */}
				{filteredAdmins.length > 0 && (
					<section className="users-section">
						<h2 className="section-title">Administrators</h2>
						<div className="users-list">
							{filteredAdmins.map((user) => (
								<article key={user.id} className="user-card admin-card">
									<div className="user-avatar" style={{ backgroundColor: user.bgColor }}>
										<span className="user-initials">{user.initials}</span>
										<span className="admin-badge">Admin</span>
									</div>
									<div className="user-info">
										<h3 className="user-name">{user.name}</h3>
										<p className="user-email">{user.email}</p>
									<div className="user-meta">
										<span className="admin-details">
											<Settings size={14} />
											Administrator - Full system access
										</span>
										<span className="user-activity">
											<Activity size={14} />
											Last active: {user.lastActive}
										</span>
									</div>
									</div>
								</article>
							))}
						</div>
					</section>
				)}

				{/* Regular Users section */}
				<section className="users-section">
					<h2 className="section-title">Users</h2>
					<div className="users-list">
						{filteredRegularUsers.map((user) => (
							<article key={user.id} className="user-card">
								<div className="user-avatar" style={{ backgroundColor: user.bgColor }}>
									<span className="user-initials">{user.initials}</span>
									<span className="user-badge">User</span>
								</div>
								<div className="user-info">
									<h3 className="user-name">{user.name}</h3>
									<p className="user-email">{user.email}</p>
									<div className="user-meta">
										<span className="user-devices">
											<Smartphone size={14} />
											{user.totalDeviceCount} {user.totalDeviceCount === 1 ? 'device' : 'devices'}
											{user.sharedDeviceCount > 0 && (
												<span className="shared-devices"> ({user.deviceCount} owned, {user.sharedDeviceCount} shared)</span>
											)}
										</span>
										<span className="user-activity">
											<Activity size={14} />
											Last active: {user.lastActive}
										</span>
									</div>
								</div>
								<div className="user-actions">
									{!user.is_staff && (
										<button
											className="btn-delete-user"
											onClick={() => handleDeleteClick(user)}
											title="Delete user"
											disabled={deletingUser}
										>
											<Trash2 size={16} />
										</button>
									)}
									<button className="btn-view-user" onClick={() => handleViewDevices(user)}>
										<span className="user-device-count">{user.totalDeviceCount} {user.totalDeviceCount === 1 ? 'device' : 'devices'}</span>
										<ChevronRight size={20} />
									</button>
								</div>
							</article>
						))}
					</div>
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
				<button className="bn-item active" onClick={() => navigate('/admin/users')}>
					<Users size={20} />
					<span>Users</span>
				</button>
				<button className="bn-item" onClick={() => navigate('/admin/settings')}>
					<Settings size={20} />
					<span>Settings</span>
				</button>
			</nav>

			{/* User Devices Modal */}
			{isModalOpen && (
				<UserDevicesModal
					user={selectedUser}
					devices={userDevices}
					loading={loadingDevices}
					onClose={handleCloseModal}
				/>
			)}

			{/* Delete Confirmation Modal */}
			<ConfirmationModal
				isOpen={isDeleteModalOpen}
				onClose={handleCloseDeleteModal}
				onConfirm={handleDeleteConfirm}
				title="Delete User"
				message={getDeleteConfirmationMessage(userToDelete)}
				confirmText={deletingUser ? "Deleting..." : "Delete User"}
				cancelText="Cancel"
				variant="danger"
			/>
		</div>
	);
}

export default AdminUsers;
