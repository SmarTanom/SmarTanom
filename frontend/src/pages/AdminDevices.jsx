import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../assets/styles/AdminDevices.css';
import logoMarkWhite from '../assets/images/logo-mark-white.png';
import {
	LayoutDashboard,
	Boxes,
	Plus,
	Users,
	Settings,
	Search,
	Leaf,
	Download,
	X,
	User,
	Calendar,
	Activity
} from 'lucide-react';

// Mock device data
const mockDevices = [
	{
		id: 1,
		serial: 'HYD-SPN-001-2025',
		owner: 'far***@example.com',
		status: 'Assigned',
		lastSeen: '2 hours ago',
		assignedDate: '1/15/2024'
	},
	{
		id: 2,
		serial: 'HYD-SPN-002-2025',
		owner: 'urb***@example.com',
		status: 'Assigned',
		lastSeen: '5 minutes ago',
		assignedDate: '2/1/2024'
	},
	{
		id: 3,
		serial: 'HYD-SPN-003-2025',
		owner: null,
		status: 'Available',
		lastSeen: 'Never connected',
		assignedDate: null
	},
	{
		id: 4,
		serial: 'HYD-SPN-004-2025',
		owner: 'pla***@example.com',
		status: 'Assigned',
		lastSeen: '1 day ago',
		assignedDate: '3/10/2024'
	},
	{
		id: 5,
		serial: 'HYD-SPN-005-2025',
		owner: null,
		status: 'Available',
		lastSeen: 'Never connected',
		assignedDate: null
	},
	{
		id: 6,
		serial: 'HYD-SPN-006-2025',
		owner: 'hyd***@example.com',
		status: 'Assigned',
		lastSeen: '30 minutes ago',
		assignedDate: '4/5/2024'
	}
];

function DeviceDetailsModal({ device, onClose }) {
	if (!device) return null;

	const handleDownloadQR = () => {
		// Placeholder for QR code download functionality
		alert(`Downloading QR code for ${device.serial}`);
	};

	return (
		<div className="modal-overlay" onClick={onClose}>
			<div className="device-modal" onClick={(e) => e.stopPropagation()}>
				<button className="modal-close" onClick={onClose} aria-label="Close">
					<X size={20} />
				</button>

				<div className="modal-header">
					<Boxes size={20} />
					<h2>Device Details</h2>
				</div>
				<p className="modal-subtitle">Complete information and QR code for device registration</p>

				<div className="modal-device-title">{device.serial}</div>
				<span className={`modal-status-badge ${device.status.toLowerCase()}`}>
					{device.status}
				</span>

				<div className="modal-info-grid">
					{device.owner && (
						<div className="modal-info-item">
							<User size={16} className="info-icon" />
							<div>
								<div className="info-label">Assigned To</div>
								<div className="info-value">{device.owner}</div>
							</div>
						</div>
					)}

					{device.assignedDate && (
						<div className="modal-info-item">
							<Calendar size={16} className="info-icon" />
							<div>
								<div className="info-label">Assigned Date</div>
								<div className="info-value">{device.assignedDate}</div>
							</div>
						</div>
					)}

					<div className="modal-info-item">
						<Activity size={16} className="info-icon" />
						<div>
							<div className="info-label">Last Activity</div>
							<div className="info-value">{device.lastSeen}</div>
						</div>
					</div>
				</div>

				<div className="qr-code-section">
					<div className="qr-code-placeholder">
						<div className="qr-icon">
							<div className="qr-square"></div>
							<div className="qr-square"></div>
							<div className="qr-square"></div>
							<div className="qr-square"></div>
							<div className="qr-dots">
								<span>•</span>
								<span>•</span>
								<span>•</span>
							</div>
						</div>
					</div>
					<div className="qr-label">QR Code for</div>
					<div className="qr-device-name">{device.serial}</div>
					<p className="qr-description">Scan this QR code to register or identify the device</p>
				</div>

				<div className="modal-actions">
					<button className="btn-download" onClick={handleDownloadQR}>
						<Download size={18} />
						Download QR Code
					</button>
					<button className="btn-close-modal" onClick={onClose}>
						Close
					</button>
				</div>
			</div>
		</div>
	);
}

export default function AdminDevices() {
	const navigate = useNavigate();
	const [searchQuery, setSearchQuery] = useState('');
	const [activeFilter, setActiveFilter] = useState('all');
	const [selectedDevice, setSelectedDevice] = useState(null);

	const totalDevices = mockDevices.length;
	const assignedCount = mockDevices.filter((d) => d.status === 'Assigned').length;
	const availableCount = mockDevices.filter((d) => d.status === 'Available').length;

	const filteredDevices = mockDevices.filter((device) => {
		const matchesSearch =
			device.serial.toLowerCase().includes(searchQuery.toLowerCase()) ||
			(device.owner && device.owner.toLowerCase().includes(searchQuery.toLowerCase()));

		const matchesFilter =
			activeFilter === 'all' ||
			(activeFilter === 'assigned' && device.status === 'Assigned') ||
			(activeFilter === 'available' && device.status === 'Available');

		return matchesSearch && matchesFilter;
	});

	return (
		<div className="admin-root">
			{/* Sidebar (desktop) */}
			<aside className="admin-sidebar" aria-label="Admin navigation">
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
					<button className="side-link active" onClick={() => navigate('/admin/devices')}>
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
				<header className="devices-header">
					<div>
						<h1 className="devices-title">Devices</h1>
						<p className="devices-sub">Manage and monitor all hydroponic devices</p>
					</div>
				</header>

				{/* Summary cards */}
				<section className="devices-summary">
					<div className="devices-stat-card">
						<div className="stat-label">TOTAL DEVICES</div>
						<div className="stat-value">{totalDevices}</div>
					</div>
					<div className="devices-stat-card">
						<div className="stat-label">ASSIGNED</div>
						<div className="stat-value stat-green">{assignedCount}</div>
					</div>
					<div className="devices-stat-card">
						<div className="stat-label">AVAILABLE</div>
						<div className="stat-value stat-orange">{availableCount}</div>
					</div>
				</section>

				{/* Search and filters */}
				<section className="devices-controls">
					<div className="search-box">
						<Search size={20} className="search-icon" />
						<input
							type="text"
							placeholder="Search devices, serial, or owner email..."
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							className="search-input"
						/>
					</div>
					<div className="filter-tabs">
						<button
							className={`filter-tab ${activeFilter === 'all' ? 'active' : ''}`}
							onClick={() => setActiveFilter('all')}
						>
							All ({totalDevices})
						</button>
						<button
							className={`filter-tab ${activeFilter === 'assigned' ? 'active' : ''}`}
							onClick={() => setActiveFilter('assigned')}
						>
							Assigned ({assignedCount})
						</button>
						<button
							className={`filter-tab ${activeFilter === 'available' ? 'active' : ''}`}
							onClick={() => setActiveFilter('available')}
						>
							Available ({availableCount})
						</button>
					</div>
				</section>

				{/* Device list */}
				<section className="devices-list">
					{filteredDevices.map((device) => (
						<article key={device.id} className="device-card">
							<div className={`device-icon ${device.status.toLowerCase()}`}>
								<Leaf size={24} strokeWidth={2} />
							</div>
							<div className="device-info">
								<h3 className="device-serial">{device.serial}</h3>
								{device.owner && (
									<div className="device-meta">
										<User size={14} />
										<span>{device.owner}</span>
									</div>
								)}
								<div className="device-status-row">
									<span className={`device-status ${device.status.toLowerCase()}`}>
										{device.status}
									</span>
									<span className="device-last-seen">Last seen: {device.lastSeen}</span>
								</div>
							</div>
							<button
								className="btn-view-details"
								onClick={() => setSelectedDevice(device)}
							>
								<Boxes size={16} />
								View Details
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
				<button className="bn-item active" onClick={() => navigate('/admin/devices')}>
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
				<button className="bn-item" onClick={() => navigate('/admin/settings')}>
					<Settings size={20} />
					<span>Settings</span>
				</button>
			</nav>

			{/* Device Details Modal */}
			{selectedDevice && (
				<DeviceDetailsModal device={selectedDevice} onClose={() => setSelectedDevice(null)} />
			)}
		</div>
	);
}

