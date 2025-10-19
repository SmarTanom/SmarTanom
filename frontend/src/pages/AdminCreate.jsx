import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import QRCode from 'qrcode';
import '../assets/styles/AdminLayout.css';
import '../assets/styles/AdminCreate.css';
import AdminNavbar from '../components/admin/AdminNavbar';
import { createDevice, getAdminDevices } from '../services/api/admin';
import {
	Smartphone,
	Sparkles,
	CheckCircle2,
	X,
	Download,
	Clock,
	Loader2,
	Users
} from 'lucide-react';

function SuccessModal({ device, qrCodeUrl, onClose }) {
	const handleDownloadQR = () => {
		const link = document.createElement('a');
		link.href = qrCodeUrl;
		link.download = `${device.serial}_QR.png`;
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
					<img src={qrCodeUrl} alt={`QR for ${device.serial}`} className="qr-code-image" />
				</div>

				<div className="success-status-badge">
					Status: Available until scanned/registered by a user
				</div>

				<div className="success-actions">
					<button className="btn-download-qr" onClick={handleDownloadQR}>
						<Download size={18} />
						Download QR
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
	const [deviceName, setDeviceName] = useState('');
	const [location, setLocation] = useState('');
	const [status, setStatus] = useState('active');
	const [isCreating, setIsCreating] = useState(false);
	const [createdDevice, setCreatedDevice] = useState(null);
	const [qrCodeUrl, setQrCodeUrl] = useState('');
	const [recentDevices, setRecentDevices] = useState([]);
	const [loadingRecent, setLoadingRecent] = useState(true);

	// Fetch recent devices on mount
	useEffect(() => {
		const fetchRecentDevices = async () => {
			try {
				const devices = await getAdminDevices();
				// Get the 5 most recent devices
				const recent = Array.isArray(devices) ? devices.slice(0, 5) : [];
				setRecentDevices(recent);
			} catch (error) {
				console.error('Failed to fetch recent devices:', error);
			} finally {
				setLoadingRecent(false);
			}
		};

		fetchRecentDevices();
	}, []);

	const handleCreateDevice = async () => {
		if (!deviceName.trim()) {
			alert('Please enter a device name');
			return;
		}

		setIsCreating(true);
		try {
			// Call backend API to create device
			const response = await createDevice({
				device_name: deviceName.trim(),
				location: location.trim() || undefined,
				status: status
			});

			const newDevice = response.device;

			// Generate QR with the same JSON payload format used elsewhere
			const qrPayload = JSON.stringify({
				serial: newDevice.serial || newDevice.device_serial || newDevice.serial_number,
				id: newDevice.id || newDevice.device_id || null,
				type: 'smartanom-device'
			});
			const qrUrl = await QRCode.toDataURL(qrPayload, {
				width: 300,
				margin: 2,
				color: {
					dark: '#2eb72e',
					light: '#ffffff'
				}
			});

			setCreatedDevice(newDevice);
			setQrCodeUrl(qrUrl);

			// Clear the form for next device
			setDeviceName('');
			setLocation('');
			setStatus('active');

			// Refresh recent devices list
			const devices = await getAdminDevices();
			const recent = Array.isArray(devices) ? devices.slice(0, 5) : [];
			setRecentDevices(recent);

		} catch (error) {
			console.error('Error creating device:', error);
			const errorMsg = error.response?.data?.error || error.message || 'Failed to create device';
			alert(errorMsg);
		} finally {
			setIsCreating(false);
		}
	};

	const closeSuccessModal = () => {
		setCreatedDevice(null);
		setQrCodeUrl('');
	};

	return (
		<div className="admin-root">
			{/* Sidebar and Bottom Nav */}
			<AdminNavbar activePage="create" />

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
							<label className="form-label">Device Name *</label>
							<input
								type="text"
								className="form-input"
								placeholder="e.g., Hydroponic System 1"
								value={deviceName}
								onChange={(e) => setDeviceName(e.target.value)}
								disabled={isCreating}
							/>
							<p className="form-help">A descriptive name for the device</p>
						</div>

						<div className="form-group">
							<label className="form-label">Location (Optional)</label>
							<input
								type="text"
								className="form-input"
								placeholder="e.g., Greenhouse A, Room 101"
								value={location}
								onChange={(e) => setLocation(e.target.value)}
								disabled={isCreating}
							/>
							<p className="form-help">Physical location of the device</p>
						</div>

						<div className="form-group">
							<label className="form-label">Status</label>
							<select
								className="form-input"
								value={status}
								onChange={(e) => setStatus(e.target.value)}
								disabled={isCreating}
							>
								<option value="active">Active</option>
								<option value="inactive">Inactive</option>
								<option value="maintenance">Maintenance</option>
							</select>
							<p className="form-help">Initial operational status</p>
						</div>

						<button
							className="btn-create-device"
							onClick={handleCreateDevice}
							disabled={isCreating}
						>
							{isCreating ? (
								<>
									<Loader2 size={18} className="spinner" />
									Creating Device...
								</>
							) : (
								<>
									<Smartphone size={18} />
									Create Device
								</>
							)}
						</button>

						<div className="info-section">
							<h3 className="info-title">What happens next?</h3>
							<ul className="info-list">
								<li className="info-item">
									<CheckCircle2 size={16} className="check-icon" />
									<span>Device serial will be auto-generated (SMRT-XXX-XXX)</span>
								</li>
								<li className="info-item">
									<CheckCircle2 size={16} className="check-icon" />
									<span>QR will be generated automatically</span>
								</li>
								<li className="info-item">
									<CheckCircle2 size={16} className="check-icon" />
									<span>Device appears in the Devices list as "Available"</span>
								</li>
								<li className="info-item">
									<CheckCircle2 size={16} className="check-icon" />
									<span>Default sensors are created automatically and it's ready for user binding via QR or email</span>
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

						{loadingRecent ? (
							<div style={{ textAlign: 'center', padding: '20px' }}>
								<Loader2 size={24} className="spinner" style={{ color: '#339432' }} />
								<p style={{ color: '#6f8876', marginTop: '8px' }}>Loading...</p>
							</div>
						) : recentDevices.length === 0 ? (
							<div style={{ textAlign: 'center', padding: '20px' }}>
								<p style={{ color: '#6f8876' }}>No devices yet</p>
							</div>
						) : (
							<div className="recent-devices-list">
								{recentDevices.map((device) => (
									<div key={device.id} className="recent-device-card">
										<div className="recent-device-header">
											<h3 className="recent-device-serial">{device.serial}</h3>
											<span className={`recent-device-status ${device.is_bound ? 'assigned' : 'available'}`}>
												{device.is_bound ? 'Assigned' : 'Available'}
											</span>
										</div>
										<p className="recent-device-time">
											{device.name || device.serial}
										</p>
										{device.owner && (
											<p className="recent-device-owner">
												<Users size={12} />
												{device.owner}
											</p>
										)}
									</div>
							))}
						</div>
					)}
				</aside>
			</div>
		</main>

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