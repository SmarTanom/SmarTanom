import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import QRCode from 'qrcode';
import '../assets/styles/AdminCreate.css';
import logoMarkWhite from '../assets/images/logo-mark-white.png';
import {
	LayoutDashboard,
	Boxes,
	Plus,
	Users,
	Settings,
	Smartphone,
	Sparkles,
	CheckCircle2,
	X,
	Download,
	Clock
} from 'lucide-react';

// Mock recent devices data
const mockRecentDevices = [
	{
		id: 1,
		serial: 'HYD-SPN-127-2025',
		status: 'Available',
		createdAt: '5 minutes ago'
	},
	{
		id: 2,
		serial: 'HYD-SPN-126-2025',
		status: 'Assigned',
		createdAt: '1 hour ago',
		owner: 'far***@example.com'
	},
	{
		id: 3,
		serial: 'HYD-SPN-125-2025',
		status: 'Assigned',
		createdAt: '2 hours ago',
		owner: 'urb***@example.com'
	},
	{
		id: 4,
		serial: 'HYD-SPN-124-2025',
		status: 'Available',
		createdAt: '1 day ago'
	}
];

function SuccessModal({ device, qrCodeUrl, onClose }) {
	const handleDownloadQR = () => {
		const link = document.createElement('a');
		link.href = qrCodeUrl;
		link.download = `${device.serial}-QRCode.png`;
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
	};

	return (
		<div className="modal-overlay" onClick={onClose}>
			<div className="success-modal" onClick={(e) => e.stopPropagation()}>
				<button className="modal-close" onClick={onClose} aria-label="Close">
					<X size={20} />
				</button>

				<div className="success-icon">
					<CheckCircle2 size={48} strokeWidth={2.5} />
				</div>

				<h2 className="success-title">Device Created Successfully!</h2>
				<p className="success-subtitle">
					Your new hydroponic device has been created and is ready for registration
				</p>

				<div className="success-device-serial">{device.serial}</div>
				<p className="success-note">Device ID has been generated successfully</p>

				<div className="qr-code-container">
					<img src={qrCodeUrl} alt={`QR Code for ${device.serial}`} className="qr-code-image" />
				</div>

				<div className="success-status-badge">
					Status: Available until scanned/registered by a user
				</div>

				<div className="success-actions">
					<button className="btn-download-qr" onClick={handleDownloadQR}>
						<Download size={18} />
						Download QR Code
					</button>
					<button className="btn-close-success" onClick={onClose}>
						Close
					</button>
				</div>
			</div>
		</div>
	);
}

function AdminCreate() {
	const navigate = useNavigate();
	const [deviceId, setDeviceId] = useState('');
	const [isGenerating, setIsGenerating] = useState(false);
	const [createdDevice, setCreatedDevice] = useState(null);
	const [qrCodeUrl, setQrCodeUrl] = useState('');

	const generateDeviceId = () => {
		setIsGenerating(true);
		// Simulate ID generation
		setTimeout(() => {
			const year = new Date().getFullYear();
			const randomNum = Math.floor(Math.random() * 900) + 100;
			const generatedId = `HYD-SPN-${randomNum}-${year}`;
			setDeviceId(generatedId);
			setIsGenerating(false);
		}, 500);
	};

	const handleCreateDevice = async () => {
		if (!deviceId.trim()) {
			alert('Please enter or generate a device ID');
			return;
		}

		try {
			// Generate QR code
			const qrUrl = await QRCode.toDataURL(deviceId, {
				width: 300,
				margin: 2,
				color: {
					dark: '#2eb72e',
					light: '#ffffff'
				}
			});

			// Create device object
			const newDevice = {
				serial: deviceId,
				createdAt: new Date().toISOString(),
				status: 'Available'
			};

			setCreatedDevice(newDevice);
			setQrCodeUrl(qrUrl);
			
			// Clear the input for next device
			setDeviceId('');
		} catch (error) {
			console.error('Error creating device:', error);
			alert('Failed to create device. Please try again.');
		}
	};

	const closeSuccessModal = () => {
		setCreatedDevice(null);
		setQrCodeUrl('');
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
					<button className="side-link active" onClick={() => navigate('/admin/create')}>
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
				<header className="create-header">
					<div>
						<h1 className="create-title">Create Device</h1>
						<p className="create-subtitle">Generate a new hydroponic monitoring device</p>
					</div>
				</header>

				<div className="create-content">
					{/* Device Registration Form */}
					<section className="registration-card">
						<div className="card-header">
							<Smartphone size={20} className="card-icon" />
							<h2 className="card-title">Device Registration</h2>
						</div>

						<div className="form-group">
							<label className="form-label">Device ID</label>
							<div className="input-with-button">
								<input
									type="text"
									className="form-input"
									placeholder="Enter device ID or generate one"
									value={deviceId}
									onChange={(e) => setDeviceId(e.target.value)}
								/>
								<button
									className="btn-generate"
									onClick={generateDeviceId}
									disabled={isGenerating}
								>
									<Sparkles size={16} />
									{isGenerating ? 'Generating...' : 'Generate'}
								</button>
							</div>
							<p className="form-help">Format: HYD-SPN-XXX-YYYY (e.g., HYD-SPN-001-2025)</p>
						</div>

						<button className="btn-create-device" onClick={handleCreateDevice}>
							<Smartphone size={18} />
							Create Device
						</button>

						<div className="info-section">
							<h3 className="info-title">What happens next?</h3>
							<ul className="info-list">
								<li className="info-item">
									<CheckCircle2 size={16} className="check-icon" />
									<span>Device will be created with "Available" status</span>
								</li>
								<li className="info-item">
									<CheckCircle2 size={16} className="check-icon" />
									<span>QR code will be generated automatically</span>
								</li>
								<li className="info-item">
									<CheckCircle2 size={16} className="check-icon" />
									<span>Device appears in the Devices list</span>
								</li>
								<li className="info-item">
									<CheckCircle2 size={16} className="check-icon" />
									<span>Ready for user assignment via QR scan</span>
								</li>
							</ul>
						</div>
					</section>

					{/* Recent Devices Sidebar */}
					<aside className="recent-devices-sidebar">
						<div className="sidebar-header">
							<Clock size={20} className="sidebar-icon" />
							<h2 className="sidebar-title">Recent Devices</h2>
						</div>

						<div className="recent-devices-list">
							{mockRecentDevices.map((device) => (
								<div key={device.id} className="recent-device-card">
									<div className="recent-device-header">
										<h3 className="recent-device-serial">{device.serial}</h3>
										<span className={`recent-device-status ${device.status.toLowerCase()}`}>
											{device.status}
										</span>
									</div>
									<p className="recent-device-time">Created {device.createdAt}</p>
									{device.owner && (
										<p className="recent-device-owner">
											<Users size={12} />
											{device.owner}
										</p>
									)}
								</div>
							))}
						</div>
					</aside>
				</div>
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
				<button className="bn-item active" onClick={() => navigate('/admin/create')}>
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

			{/* Success Modal with QR Code */}
			{createdDevice && (
				<SuccessModal
					device={createdDevice}
					qrCodeUrl={qrCodeUrl}
					onClose={closeSuccessModal}
				/>
			)}
		</div>
	);
}

export default AdminCreate;
