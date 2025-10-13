import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../assets/styles/AdminUsers.css';
import logoMarkWhite from '../assets/images/logo-mark-white.png';
import {
	LayoutDashboard,
	Boxes,
	Plus,
	Users,
	Settings,
	Search,
	Smartphone,
	Activity,
	ChevronRight
} from 'lucide-react';

// Mock users data
const mockUsers = [
	{
		id: 1,
		name: 'John Farmer',
		email: 'far***@example.com',
		initials: 'JF',
		deviceCount: 3,
		lastActive: '2 hours ago',
		bgColor: '#d1fae5'
	},
	{
		id: 2,
		name: 'Maria Santos',
		email: 'urb***@example.com',
		initials: 'MS',
		deviceCount: 1,
		lastActive: '1 day ago',
		bgColor: '#d1fae5'
	},
	{
		id: 3,
		name: 'Carlos Rivera',
		email: 'riv***@example.com',
		initials: 'CR',
		deviceCount: 2,
		lastActive: '3 hours ago',
		bgColor: '#e0e7ff'
	},
	{
		id: 4,
		name: 'Ana Martinez',
		email: 'ana***@example.com',
		initials: 'AM',
		deviceCount: 4,
		lastActive: '5 minutes ago',
		bgColor: '#fce7f3'
	},
	{
		id: 5,
		name: 'David Chen',
		email: 'che***@example.com',
		initials: 'DC',
		deviceCount: 2,
		lastActive: '2 days ago',
		bgColor: '#fef3c7'
	}
];

function AdminUsers() {
	const navigate = useNavigate();
	const [searchQuery, setSearchQuery] = useState('');

	const totalUsers = mockUsers.length;
	const totalDevices = mockUsers.reduce((sum, user) => sum + user.deviceCount, 0);
	const avgPerUser = (totalDevices / totalUsers).toFixed(1);

	const filteredUsers = mockUsers.filter(user =>
		user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
		user.email.toLowerCase().includes(searchQuery.toLowerCase())
	);

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
						<div className="stat-label">TOTAL DEVICES</div>
						<div className="stat-value stat-green">{totalDevices}</div>
					</div>
					<div className="users-stat-card">
						<div className="stat-label">AVG PER USER</div>
						<div className="stat-value">{avgPerUser}</div>
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

				{/* Users list */}
				<section className="users-list">
					{filteredUsers.map((user) => (
						<article key={user.id} className="user-card">
							<div className="user-avatar" style={{ backgroundColor: user.bgColor }}>
								<span className="user-initials">{user.initials}</span>
							</div>
							<div className="user-info">
								<h3 className="user-name">{user.name}</h3>
								<p className="user-email">{user.email}</p>
								<div className="user-meta">
									<span className="user-devices">
										<Smartphone size={14} />
										{user.deviceCount} {user.deviceCount === 1 ? 'device' : 'devices'}
									</span>
									<span className="user-activity">
										<Activity size={14} />
										Last active: {user.lastActive}
									</span>
								</div>
							</div>
							<button className="btn-view-user">
								<span className="user-device-count">{user.deviceCount} {user.deviceCount === 1 ? 'device' : 'devices'}</span>
								<ChevronRight size={20} />
							</button>
						</article>
					))}
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
		</div>
	);
}

export default AdminUsers;
