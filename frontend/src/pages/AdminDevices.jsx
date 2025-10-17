
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { toast } from 'react-toastify';
import ConfirmationModal from '../components/ConfirmationModal';
import '../assets/styles/AdminLayout.css';
import '../assets/styles/AdminDevices.css';
import logoMarkWhite from '../assets/images/logo-mark-white.png';
import useAdminRealtimeStore from '../store/adminRealtimeStore';
import { apiClient } from '../services/apiClient';
import { wsClient } from '../services/websocketClient';
import {
	LayoutDashboard,
	Boxes,
	Plus,
	Users,
	Settings,
	Bell,
	Search,
	Leaf,
	Download,
	X,
	User,
	Calendar,
	Activity,
	Loader2,
	UserPlus,
	UserMinus,
	Share2,
	Mail,
	CheckCircle,
	Trash2,
	Settings as SettingsIcon
} from 'lucide-react';

function DeviceDetailsModal({ device, onClose, onDeviceUpdate }) {
	const qrRef = useRef(null);
	const [loading, setLoading] = useState(false);
	const [bindEmail, setBindEmail] = useState('');
	const [otpCode, setOtpCode] = useState('');
	const [otpSent, setOtpSent] = useState(false);
	const [showBindForm, setShowBindForm] = useState(false);
	const [collaborators, setCollaborators] = useState([]);
	const [loadingCollaborators, setLoadingCollaborators] = useState(true);

	// Add collaborator state
	const [newCollabEmail, setNewCollabEmail] = useState('');
	const [showAddCollabForm, setShowAddCollabForm] = useState(false);
	const [addingCollab, setAddingCollab] = useState(false);
	const [collabOtpCode, setCollabOtpCode] = useState('');
	const [collabOtpSent, setCollabOtpSent] = useState(false);

	// Confirmation modal states
	const [confirmModal, setConfirmModal] = useState({
		isOpen: false,
		action: null,
		title: '',
		message: '',
		variant: 'warning',
		data: null
	});

	useEffect(() => {
		if (device && device.id) {
			fetchCollaborators();
		}
	}, [device]);

	const fetchCollaborators = async () => {
		try {
			setLoadingCollaborators(true);
			const authToken = localStorage.getItem('authToken');
			const data = await apiClient.get(`/api/devices/${device.id}/collaborators/`, { authToken });
			setCollaborators(data.results || []);
		} catch (error) {
			console.error('Failed to fetch collaborators:', error);
			toast.error(error.message || 'Failed to load collaborators');
			setCollaborators([]);
		} finally {
			setLoadingCollaborators(false);
		}
	};

	if (!device) return null;

	const handleDownloadQR = () => {
		setConfirmModal({
			isOpen: true,
			action: 'download',
			title: 'Download QR',
			message: `Download the QR for device ${device.serial || device.device_serial}?`,
			variant: 'info'
		});
	};

	const executeDownloadQR = async () => {
		try {
			const svg = qrRef.current.querySelector('svg');
			if (!svg) {
				toast.error('QR not found');
				return;
			}

			const canvas = document.createElement('canvas');
			const ctx = canvas.getContext('2d');
			const svgData = new XMLSerializer().serializeToString(svg);
			const img = new Image();

			const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
			const url = URL.createObjectURL(svgBlob);

			img.onload = () => {
				canvas.width = img.width;
				canvas.height = img.height;
				ctx.fillStyle = 'white';
				ctx.fillRect(0, 0, canvas.width, canvas.height);
				ctx.drawImage(img, 0, 0);

				canvas.toBlob((blob) => {
					const downloadUrl = URL.createObjectURL(blob);
					const link = document.createElement('a');
					link.href = downloadUrl;
					link.download = `${device.serial || device.device_serial}_QR.png`;
					document.body.appendChild(link);
					link.click();
					document.body.removeChild(link);
					URL.revokeObjectURL(downloadUrl);
					URL.revokeObjectURL(url);
					toast.success('QR image downloaded successfully');
				});
			};

			img.src = url;
		} catch (error) {
			console.error('Error downloading QR:', error);
			toast.error('Failed to download QR. Please try again.');
		}
	};

	// Handle confirmation modal actions
	const handleConfirmAction = () => {
		switch (confirmModal.action) {
			case 'unbind':
				executeUnbind();
				break;
			case 'revoke':
				executeRevokeAccess();
				break;
			case 'download':
				executeDownloadQR();
				break;
			case 'confirm-bind':
				executeConfirmBind();
				break;
			default:
				break;
		}
	};
	const handleSendOTP = async (e) => {
		e.preventDefault();
		if (!bindEmail.trim()) {
			toast.error('Please enter an email address');
			return;
		}

		try {
			setLoading(true);
			const authToken = localStorage.getItem('authToken');
			const response = await apiClient.post(
				`/api/devices/${device.id}/bind-otp/`,
				{ email: bindEmail.trim() },
				{ authToken }
			);

			toast.success(`OTP sent to ${bindEmail}`);
			setOtpSent(true);
		} catch (error) {
			console.error('Failed to send OTP:', error);
			const errorMsg = error.data?.detail || error.message || 'Failed to send OTP';
			toast.error(errorMsg);
		} finally {
			setLoading(false);
		}
	};

	const handleConfirmBind = async (e) => {
		e.preventDefault();
		if (!otpCode.trim()) {
			toast.error('Please enter the OTP code');
			return;
		}

		setConfirmModal({
			isOpen: true,
			action: 'confirm-bind',
			title: 'Confirm Device Binding',
			message: `Bind device ${device.device_serial} to ${bindEmail}?`,
			variant: 'info',
			data: { email: bindEmail, otp: otpCode.trim() }
		});
	};

	const executeConfirmBind = async () => {
		const { email, otp } = confirmModal.data;

		try {
			setLoading(true);
			const authToken = localStorage.getItem('authToken');
			const response = await apiClient.post(
				`/api/devices/${device.id}/confirm-bind/`,
				{ email, otp },
				{ authToken }
			);

			toast.success(`Device successfully bound to ${email}`);

			// Update the local device state to reflect bound status
			const updatedDevice = {
				...device,
				is_bound: true,
				bound_email: email,
				owner: email
			};

			setBindEmail('');
			setOtpCode('');
			setOtpSent(false);
			setShowBindForm(false);

			// Trigger parent component update for device list and modal
			if (onDeviceUpdate) {
				onDeviceUpdate(updatedDevice);
			}
		} catch (error) {
			console.error('Failed to bind device:', error);
			const errorMsg = error.data?.detail || error.message || 'Failed to bind device';
			toast.error(errorMsg);
		} finally {
			setLoading(false);
		}
	};

	const handleUnbindDevice = () => {
		setConfirmModal({
			isOpen: true,
			action: 'unbind',
			title: 'Unbind Device',
			message: `Are you sure you want to unbind this device from ${device.owner || device.bound_email}? This action cannot be undone.`,
			variant: 'danger'
		});
	};

	const executeUnbind = async () => {
		try {
			setLoading(true);
			const authToken = localStorage.getItem('authToken');
			const response = await apiClient.post(
				`/api/devices/${device.id}/admin-unbind/`,
				{},
				{ authToken }
			);

			toast.success('Device successfully unbound');

			// Update the local device state to reflect unbound status
			const updatedDevice = {
				...device,
				is_bound: false,
				bound_email: null,
				owner: null
			};

			// Refresh collaborators list (should be empty after unbinding)
			await fetchCollaborators();

			// Trigger parent component update for device list and modal
			if (onDeviceUpdate) {
				onDeviceUpdate(updatedDevice);
			}
		} catch (error) {
			console.error('Failed to unbind device:', error);
			const errorMsg = error.data?.detail || error.message;
			if (errorMsg === 'Device is not currently bound to any user.') {
				toast.warning(errorMsg);
			} else {
				toast.error(errorMsg || 'Failed to unbind device');
			}
		} finally {
			setLoading(false);
		}
	};

	const handleRevokeAccess = (userId, email) => {
		setConfirmModal({
			isOpen: true,
			action: 'revoke',
			title: 'Revoke Collaborator Access',
			message: `Are you sure you want to revoke access for ${email}? The user may be logged out if they have no other active collaborations.`,
			variant: 'danger',
			data: { userId, email }
		});
	};

	const executeRevokeAccess = async () => {
		const { userId, email } = confirmModal.data;

		try {
			const authToken = localStorage.getItem('authToken');
			const response = await apiClient.post(
				`/api/devices/${device.id}/revoke/${userId}/`,
				{},
				{ authToken }
			);

			const msg = response.user_deactivated
				? `Collaborator access revoked — user logged out`
				: `Access revoked for ${email}`;
			toast.success(msg);
			fetchCollaborators(); // Refresh the list
		} catch (error) {
			console.error('Failed to revoke access:', error);
			const errorMsg = error.data?.detail || error.message || 'Failed to revoke access';
			toast.error(errorMsg);
		}
	};

	const handleSendCollabOTP = async (e) => {
		e.preventDefault();

		if (!newCollabEmail.trim()) {
			toast.error('Please enter an email address');
			return;
		}

		try {
			setAddingCollab(true);
			const authToken = localStorage.getItem('authToken');
			const response = await apiClient.post(
				`/api/devices/${device.id}/send-collaborator-otp/`,
				{ email: newCollabEmail.trim() },
				{ authToken }
			);

			toast.success(`OTP sent to ${newCollabEmail}`);
			setCollabOtpSent(true);
		} catch (error) {
			console.error('Failed to send collaborator OTP:', error);
			const errorMsg = error.data?.detail || error.message || 'Failed to send OTP';
			toast.error(errorMsg);
		} finally {
			setAddingCollab(false);
		}
	};

	const handleConfirmAddCollaborator = async (e) => {
		e.preventDefault();

		if (!collabOtpCode.trim()) {
			toast.error('Please enter the OTP code');
			return;
		}

		try {
			setAddingCollab(true);
			const authToken = localStorage.getItem('authToken');
			const response = await apiClient.post(
				`/api/devices/${device.id}/confirm-add-collaborator/`,
				{
					email: newCollabEmail.trim(),
					otp: collabOtpCode.trim()
				},
				{ authToken }
			);

			toast.success(`Collaborator ${newCollabEmail} added successfully`);
			setNewCollabEmail('');
			setCollabOtpCode('');
			setCollabOtpSent(false);
			setShowAddCollabForm(false);
			// Refresh collaborators list
			await fetchCollaborators();
		} catch (error) {
			console.error('Failed to add collaborator:', error);
			const errorMsg = error.data?.detail || error.message || 'Failed to add collaborator';
			toast.error(errorMsg);
		} finally {
			setAddingCollab(false);
		}
	};


	const deviceSerial = device.serial || device.device_serial;
	const deviceOwner = device.owner || device.bound_email;
	const deviceId = device.id;

	// Create QR code data with device information
	const qrData = JSON.stringify({
		serial: deviceSerial,
		id: deviceId,
		type: 'smartanom-device'
	});

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
				<p className="modal-subtitle">Complete information and QR for device registration</p>

				<div className="modal-device-title">{deviceSerial}</div>
				<span className={`modal-status-badge ${device.status.toLowerCase()}`}>
					{device.status}
				</span>

				<div className="modal-info-grid">
					{deviceOwner && (
						<div className="modal-info-item">
							<User size={16} className="info-icon" />
							<div>
								<div className="info-label">Assigned To</div>
								<div className="info-value">{deviceOwner}</div>
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
							<div className="info-value">{device.lastSeen || 'Never'}</div>
						</div>
					</div>
				</div>

				{/* QR Section */}
				<div className="qr-code-section">
					<div className="qr-code-container" ref={qrRef}>
						<QRCodeSVG
							value={qrData}
							size={300}
							level="H"
							includeMargin={true}
							fgColor="#2eb72e"
							bgColor="#ffffff"
						/>
					</div>
					<div className="qr-label">QR for</div>
					<div className="qr-device-name">{deviceSerial}</div>
					<p className="qr-description">Scan this QR to register or identify the device</p>
				</div>

				{/* Device Binding Section */}
				<div className="device-actions-section">
					{deviceOwner ? (
						<div className="bound-device-info">
							<div className="bound-header">
								<User size={16} />
								<span>Device Owner</span>
							</div>
							<div className="bound-email">{deviceOwner}</div>
							<button
								className="btn-unbind"
								onClick={handleUnbindDevice}
								disabled={loading}
							>
								<UserMinus size={16} />
								{loading ? 'Unbinding...' : 'Unbind Device'}
							</button>
						</div>
					) : (
						<div className="bind-device-section">
							{!showBindForm ? (
								<button
									className="btn-show-bind-form"
									onClick={() => setShowBindForm(true)}
								>
									<UserPlus size={16} />
									Bind Device to User
								</button>
							) : (
								<div className="bind-form">
									{!otpSent ? (
										<form onSubmit={handleSendOTP}>
											<label htmlFor="bind-email">User Email</label>
											<input
												id="bind-email"
												type="email"
												value={bindEmail}
												onChange={(e) => setBindEmail(e.target.value)}
												placeholder="user@example.com"
												required
												disabled={loading}
											/>

											<div className="bind-form-actions">
												<button type="submit" disabled={loading}>
													<Mail size={16} />
													{loading ? 'Sending...' : 'Send OTP'}
												</button>
												<button
													type="button"
													onClick={() => {
														setShowBindForm(false);
														setBindEmail('');
														setOtpSent(false);
													}}
													disabled={loading}
												>
													Cancel
												</button>
											</div>
										</form>
									) : (
										<form onSubmit={handleConfirmBind}>
											<label htmlFor="bind-email">User Email</label>
											<input
												id="bind-email"
												type="email"
												value={bindEmail}
												readOnly
												disabled
											/>

											<label htmlFor="otp-code" style={{ marginTop: '12px' }}>
												OTP Code
												<span style={{ fontSize: '12px', color: '#666', fontWeight: 'normal', marginLeft: '8px' }}>
													(Check email for 6-digit code)
												</span>
											</label>
											<input
												id="otp-code"
												type="text"
												value={otpCode}
												onChange={(e) => setOtpCode(e.target.value)}
												placeholder="000000"
												maxLength="6"
												required
												disabled={loading}
											/>

											<div className="bind-form-actions">
												<button type="submit" disabled={loading}>
													<CheckCircle size={16} />
													{loading ? 'Confirming...' : 'Confirm Bind'}
												</button>
												<button
													type="button"
													onClick={() => {
														setShowBindForm(false);
														setBindEmail('');
														setOtpCode('');
														setOtpSent(false);
													}}
													disabled={loading}
												>
													Cancel
												</button>
											</div>
										</form>
									)}
								</div>
							)}
						</div>
					)}
				</div>

				{/* Collaborators Section */}
				{deviceOwner && (
					<div className="collaborators-section">
						<div className="collaborators-header">
							<Share2 size={16} />
							<span>Shared With</span>
						</div>
						{loadingCollaborators ? (
							<div className="loading-collaborators">
								<Loader2 size={16} className="spin" />
								<span>Loading collaborators...</span>
							</div>
						) : (
							<>
								{collaborators.length > 0 && (
									<ul className="collaborators-list">
										{collaborators.map((collab) => (
											<li key={collab.id} className="collaborator-item">
												<User size={14} />
												<span className="collab-email">{collab.collaborator_email}</span>
												<span className="collab-permission">{collab.permissions}</span>
												<button
													className="btn-revoke-collab"
													onClick={() => handleRevokeAccess(collab.user_id || collab.id, collab.collaborator_email)}
													title="Revoke Access"
												>
													<UserMinus size={14} />
												</button>
											</li>
										))}
									</ul>
								)}

								{/* Add Collaborator Form */}
								<div className="add-collaborator-section">
									{!showAddCollabForm ? (
										<button
											className="btn-add-collaborator"
											onClick={() => setShowAddCollabForm(true)}
										>
											<UserPlus size={14} />
											Add Collaborator
										</button>
									) : (
										<form onSubmit={collabOtpSent ? handleConfirmAddCollaborator : handleSendCollabOTP} className="add-collab-form">
											<label htmlFor="collab-email">Collaborator Email</label>
											<input
												id="collab-email"
												type="email"
												value={newCollabEmail}
												onChange={(e) => setNewCollabEmail(e.target.value)}
												placeholder="user@example.com"
												required
												disabled={addingCollab || collabOtpSent}
											/>

											{collabOtpSent && (
												<>
													<label htmlFor="collab-otp" style={{ marginTop: '12px' }}>
														OTP Code
														<span style={{ fontSize: '12px', color: '#666', fontWeight: 'normal', marginLeft: '8px' }}>
															(Check email for 6-digit code)
														</span>
													</label>
													<input
														id="collab-otp"
														type="text"
														value={collabOtpCode}
														onChange={(e) => setCollabOtpCode(e.target.value)}
														placeholder="000000"
														maxLength="6"
														required
														disabled={addingCollab}
													/>
												</>
											)}

											<div className="add-collab-actions">
												<button type="submit" disabled={addingCollab}>
													{addingCollab ? (collabOtpSent ? 'Confirming...' : 'Sending...') : (collabOtpSent ? 'Confirm Add' : 'Send OTP')}
												</button>
												<button
													type="button"
													onClick={() => {
														setShowAddCollabForm(false);
														setNewCollabEmail('');
														setCollabOtpCode('');
														setCollabOtpSent(false);
													}}
													disabled={addingCollab}
												>
													Cancel
												</button>
											</div>
										</form>
									)}
								</div>

								{collaborators.length === 0 && !showAddCollabForm && (
									<p className="no-collaborators">No collaborators yet</p>
								)}
							</>
						)}
					</div>
				)}

				<div className="modal-actions">
					<button className="btn-download" onClick={handleDownloadQR}>
						<Download size={18} />
						Download QR
					</button>
					<button className="btn-close-modal" onClick={onClose}>
						Close
					</button>
				</div>
			</div>

			{/* Confirmation Modal */}
			<ConfirmationModal
				isOpen={confirmModal.isOpen}
				onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
				onConfirm={handleConfirmAction}
				title={confirmModal.title}
				message={confirmModal.message}
				variant={confirmModal.variant}
				confirmText="Confirm"
				cancelText="Cancel"
			/>
		</div>
	);
}

export default function AdminDevices() {
	const navigate = useNavigate();
	const [searchQuery, setSearchQuery] = useState('');
	const [activeFilter, setActiveFilter] = useState('all'); // Assignment filter
	const [statusFilter, setStatusFilter] = useState('all'); // Operational status filter
	const [selectedDevice, setSelectedDevice] = useState(null);

	// Delete confirmation modal state
	const [deleteModal, setDeleteModal] = useState({
		isOpen: false,
		device: null
	});

	// Status update modal state
	const [statusModal, setStatusModal] = useState({
		isOpen: false,
		device: null,
		newStatus: null
	});

	// Use admin realtime store
	const devices = useAdminRealtimeStore(state => state.allDevices);
	const loading = useAdminRealtimeStore(state => state.loadingDevices);
	const error = useAdminRealtimeStore(state => state.errorDevices);
	const fetchAdminDevices = useAdminRealtimeStore(state => state.fetchAdminDevices);
	const connectAdminWS = useAdminRealtimeStore(state => state.connectAdminWS);

	useEffect(() => {
		// Fetch initial device data
		fetchAdminDevices();

		// Connect to WebSocket and subscribe to updates
		console.log('[AdminDevices] Connecting to WebSocket...');
		wsClient.connect();
		const unsubscribeWS = connectAdminWS();

		// Cleanup on unmount
		return () => {
			console.log('[AdminDevices] Unsubscribing from WebSocket');
			unsubscribeWS();
		};
	}, [fetchAdminDevices, connectAdminWS]);

	// Helper function to format last seen time
	const formatLastSeen = (lastSeenStr) => {
		// Backend already returns formatted string like "2 hours ago" or "Never"
		if (!lastSeenStr || lastSeenStr === 'Never') return 'Never connected';
		return lastSeenStr;
	};

	// Helper function to get device status for assignment (not operational status)
	const getDeviceStatus = (device) => {
		// Priority 1: Check if device is bound/has owner (regardless of operational status)
		if (device.is_bound === true || device.owner) return 'Assigned';
		// Priority 2: Device is not bound and has no owner
		if (device.is_bound === false && !device.owner) return 'Available';
		// Fallback: if is_bound is undefined/null, check for owner
		return device.owner ? 'Assigned' : 'Available';
	};

	// Helper function to mask email
	const maskEmail = (email) => {
		if (!email) return null;
		const [name, domain] = email.split('@');
		return `${name.slice(0, 3)}***@${domain}`;
	};

	// Handle device deletion
	const handleDeleteDevice = (device) => {
		setDeleteModal({
			isOpen: true,
			device: device
		});
	};

	const executeDeleteDevice = async () => {
		const device = deleteModal.device;
		if (!device) return;

		try {
			const authToken = localStorage.getItem('authToken');
			await apiClient.delete(`/api/devices/${device.id}/`, { authToken });

			toast.success(`Device ${device.serial} deleted successfully`);
			fetchAdminDevices(); // Refresh the device list
		} catch (error) {
			console.error('Failed to delete device:', error);
			const errorMsg = error.data?.detail || error.message || 'Failed to delete device';
			toast.error(errorMsg);
		} finally {
			setDeleteModal({ isOpen: false, device: null });
		}
	};

	// Handle status change request
	const handleStatusChange = (device, newStatus) => {
		setOpenStatusDropdown(null); // Close dropdown
		setStatusModal({
			isOpen: true,
			device: device,
			newStatus: newStatus
		});
	};

	// Execute status update
	const executeStatusUpdate = async () => {
		const { device, newStatus } = statusModal;
		if (!device || !newStatus) return;

		try {
			const authToken = localStorage.getItem('authToken');
			await apiClient.patch(`/api/devices/${device.id}/`, {
				status: newStatus
			}, { authToken });

			toast.success(`Device ${device.serial} status updated to ${getStatusLabel(newStatus)}`);
			fetchAdminDevices(); // Refresh the device list
		} catch (error) {
			console.error('Failed to update device status:', error);
			const errorMsg = error.data?.detail || error.message || 'Failed to update device status';
			toast.error(errorMsg);
		} finally {
			setStatusModal({ isOpen: false, device: null, newStatus: null });
		}
	};

	// Get status label with emoji
	const getStatusLabel = (status) => {
		const statusMap = {
			'active': '🟢 Active',
			'inactive': '⚪ Inactive',
			'maintenance': '🛠️ Maintenance',
			'decommissioned': '🔴 Decommissioned'
		};
		return statusMap[status] || status;
	};

	// Ensure devices is always an array before mapping
	const safeDevices = Array.isArray(devices) ? devices : [];

	// Format devices for display
	const formattedDevices = safeDevices.map(device => ({
		id: device.id,
		serial: device.serial || device.device_serial || device.serial_number || 'Unknown',
		owner: device.owner || (device.owner_email ? maskEmail(device.owner_email) : null),
		full_owner_email: device.owner_email,
		status: getDeviceStatus(device),
		operationalStatus: device.status || 'active', // Backend operational status (active, inactive, maintenance, decommissioned)
		lastSeen: formatLastSeen(device.last_seen),
		assignedDate: device.assigned_date ? new Date(device.assigned_date).toLocaleDateString() : null,
		device_name: device.name || device.device_name || device.serial,
		is_bound: device.is_bound, // Keep for debugging
		collaborations_count: device.collaborations_count || 0
	}));

	console.log('📦 Device Status Breakdown:', {
		total: formattedDevices.length,
		assigned: formattedDevices.filter(d => d.status === 'Assigned').length,
		available: formattedDevices.filter(d => d.status === 'Available').length,
		devices: formattedDevices.map(d => ({
			serial: d.serial,
			is_bound: d.is_bound,
			owner: d.owner,
			status: d.status
		}))
	});

	const totalDevices = formattedDevices.length;
	const assignedCount = formattedDevices.filter((d) => d.status === 'Assigned').length;
	const availableCount = formattedDevices.filter((d) => d.status === 'Available').length;
	const sharedCount = safeDevices.filter((d) => (d.collaborations_count || 0) > 0).length;

	// Operational status counts
	const activeStatusCount = formattedDevices.filter((d) => d.operationalStatus === 'active').length;
	const inactiveStatusCount = formattedDevices.filter((d) => d.operationalStatus === 'inactive').length;
	const maintenanceStatusCount = formattedDevices.filter((d) => d.operationalStatus === 'maintenance').length;
	const decommissionedStatusCount = formattedDevices.filter((d) => d.operationalStatus === 'decommissioned').length;

	const filteredDevices = formattedDevices.filter((device) => {
		const matchesSearch =
			device.serial.toLowerCase().includes(searchQuery.toLowerCase()) ||
			(device.owner && device.owner.toLowerCase().includes(searchQuery.toLowerCase())) ||
			(device.full_owner_email && device.full_owner_email.toLowerCase().includes(searchQuery.toLowerCase())) ||
			(device.device_name && device.device_name.toLowerCase().includes(searchQuery.toLowerCase()));

		const matchesAssignmentFilter =
			activeFilter === 'all' ||
			(activeFilter === 'assigned' && (device.status === 'Assigned' || device.status === 'Active')) ||
			(activeFilter === 'available' && device.status === 'Available') ||
			(activeFilter === 'shared' && safeDevices.find(d => d.id === device.id)?.collaborations_count > 0);

		const matchesStatusFilter =
			statusFilter === 'all' ||
			device.operationalStatus === statusFilter;

		return matchesSearch && matchesAssignmentFilter && matchesStatusFilter;
	});

	// Loading state
	if (loading) {
		return (
			<div className="admin-root">
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
				</aside>
				<main className="admin-main" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
					<div style={{ textAlign: 'center' }}>
						<Loader2 size={48} className="spinner" style={{ color: '#339432' }} />
						<p style={{ marginTop: '16px', color: '#6f8876' }}>Loading devices...</p>
					</div>
				</main>
			</div>
		);
	}

	// Error state
	if (error) {
		return (
			<div className="admin-root">
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
				</aside>
				<main className="admin-main" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
					<div style={{ textAlign: 'center', maxWidth: '400px' }}>
						<X size={48} style={{ color: '#ef4444' }} />
						<p style={{ marginTop: '16px', color: '#dc2626', fontWeight: 600 }}>{error}</p>
						<button
							onClick={() => window.location.reload()}
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
					<button className="side-link" onClick={() => navigate('/admin/alerts')}>
						<Bell size={18} />
						<span>Alerts</span>
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
					<div className="devices-stat-card">
						<div className="stat-label">SHARED</div>
						<div className="stat-value stat-blue">{sharedCount}</div>
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

					{/* Assignment Status Filters */}
					<div className="filter-section">
						<div className="filter-label">Assignment Status</div>
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
							<button
								className={`filter-tab ${activeFilter === 'shared' ? 'active' : ''}`}
								onClick={() => setActiveFilter('shared')}
							>
								Shared ({sharedCount})
							</button>
						</div>
					</div>

					{/* Operational Status Filters */}
					<div className="filter-section">
						<div className="filter-label">Operational Status</div>
						<div className="filter-tabs">
							<button
								className={`filter-tab ${statusFilter === 'all' ? 'active' : ''}`}
								onClick={() => setStatusFilter('all')}
							>
								All ({totalDevices})
							</button>
							<button
								className={`filter-tab status-active ${statusFilter === 'active' ? 'active' : ''}`}
								onClick={() => setStatusFilter('active')}
							>
								🟢 Active ({activeStatusCount})
							</button>
							<button
								className={`filter-tab status-inactive ${statusFilter === 'inactive' ? 'active' : ''}`}
								onClick={() => setStatusFilter('inactive')}
							>
								⚪ Inactive ({inactiveStatusCount})
							</button>
							<button
								className={`filter-tab status-maintenance ${statusFilter === 'maintenance' ? 'active' : ''}`}
								onClick={() => setStatusFilter('maintenance')}
							>
								🛠️ Maintenance ({maintenanceStatusCount})
							</button>
							<button
								className={`filter-tab status-decommissioned ${statusFilter === 'decommissioned' ? 'active' : ''}`}
								onClick={() => setStatusFilter('decommissioned')}
							>
								🔴 Decommissioned ({decommissionedStatusCount})
							</button>
						</div>
					</div>
				</section>

				{/* Device list */}
				<section className="devices-list">
					{filteredDevices.map((device) => (
						<article key={device.id} className="device-card">
							<div className={`device-icon ${device.operationalStatus.toLowerCase()}`}>
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
									<span className="device-operational-status">
										{getStatusLabel(device.operationalStatus)}
									</span>
									<span className="device-last-seen">Last seen: {device.lastSeen}</span>
								</div>
							</div>
							<div className="device-actions">
								<button
									className="btn-view-details"
									onClick={() => setSelectedDevice(device)}
								>
									<Boxes size={16} />
									View Details
								</button>
								<button
									className="btn-set-status"
									onClick={() => setStatusModal({ isOpen: true, device: device, newStatus: null })}
									title="Set Device Status"
								>
									<SettingsIcon size={16} />
									Set Status
								</button>
								<button
									className="btn-delete-device"
									onClick={() => handleDeleteDevice(device)}
									title="Delete Device"
								>
									<Trash2 size={16} />
									Delete
								</button>
							</div>
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
				<DeviceDetailsModal
					device={selectedDevice}
					onClose={() => setSelectedDevice(null)}
					onDeviceUpdate={(updatedDevice) => {
						if (updatedDevice) {
							// Update the selected device state
							setSelectedDevice(updatedDevice);
						}
						// Refresh the device list
						fetchAdminDevices();
					}}
				/>
			)}

			{/* Delete Confirmation Modal */}
			<ConfirmationModal
				isOpen={deleteModal.isOpen}
				onClose={() => setDeleteModal({ isOpen: false, device: null })}
				onConfirm={executeDeleteDevice}
				title="Delete Device"
				message={`Are you sure you want to delete device "${deleteModal.device?.serial}"? This action cannot be undone and will permanently remove the device and all associated data.`}
				variant="danger"
				confirmText="Delete Device"
				cancelText="Cancel"
			/>

			{/* Status Update Confirmation Modal */}
			<ConfirmationModal
				isOpen={statusModal.isOpen && statusModal.newStatus !== null}
				onClose={() => setStatusModal({ isOpen: false, device: null, newStatus: null })}
				onConfirm={executeStatusUpdate}
				title="Update Device Status"
				message={`Are you sure you want to set device "${statusModal.device?.serial}" to ${getStatusLabel(statusModal.newStatus)}?`}
				variant="warning"
				confirmText="Confirm"
				cancelText="Cancel"
			/>

			{/* Status Selection Modal */}
			{statusModal.isOpen && statusModal.newStatus === null && (
				<div className="modal-overlay" onClick={() => setStatusModal({ isOpen: false, device: null, newStatus: null })}>
					<div className="status-selection-modal" onClick={(e) => e.stopPropagation()}>
						<div className="status-modal-header">
							<h3>Set Device Status</h3>
							<p>Select a new status for device <strong>{statusModal.device?.serial}</strong></p>
							<p className="current-status">Current: {getStatusLabel(statusModal.device?.operationalStatus)}</p>
						</div>
						<div className="status-options">
							<button
								className={`status-option ${statusModal.device?.operationalStatus === 'active' ? 'current' : ''}`}
								onClick={() => {
									setStatusModal({ ...statusModal, newStatus: 'active' });
								}}
							>
								<span className="status-emoji">🟢</span>
								<div className="status-info">
									<div className="status-name">Active</div>
									<div className="status-description">Device is operational and functioning normally</div>
								</div>
							</button>
							<button
								className={`status-option ${statusModal.device?.operationalStatus === 'inactive' ? 'current' : ''}`}
								onClick={() => {
									setStatusModal({ ...statusModal, newStatus: 'inactive' });
								}}
							>
								<span className="status-emoji">⚪</span>
								<div className="status-info">
									<div className="status-name">Inactive</div>
									<div className="status-description">Device is not currently in use</div>
								</div>
							</button>
							<button
								className={`status-option ${statusModal.device?.operationalStatus === 'maintenance' ? 'current' : ''}`}
								onClick={() => {
									setStatusModal({ ...statusModal, newStatus: 'maintenance' });
								}}
							>
								<span className="status-emoji">🛠️</span>
								<div className="status-info">
									<div className="status-name">Maintenance</div>
									<div className="status-description">Device is undergoing repairs or updates</div>
								</div>
							</button>
							<button
								className={`status-option ${statusModal.device?.operationalStatus === 'decommissioned' ? 'current' : ''}`}
								onClick={() => {
									setStatusModal({ ...statusModal, newStatus: 'decommissioned' });
								}}
							>
								<span className="status-emoji">🔴</span>
								<div className="status-info">
									<div className="status-name">Decommissioned</div>
									<div className="status-description">Device is permanently retired from service</div>
								</div>
							</button>
						</div>
						<button
							className="btn-cancel-status"
							onClick={() => setStatusModal({ isOpen: false, device: null, newStatus: null })}
						>
							Cancel
						</button>
					</div>
				</div>
			)}
		</div>
	);
}
