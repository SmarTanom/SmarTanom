import React, { useState, useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { toast } from 'react-toastify';
import ConfirmationModal from './ConfirmModal';
import { apiClient } from '../../services/apiClient';
import {
	Boxes,
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
	Download,
	Trash2
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
			title: 'Download QR Code',
			message: `Download the QR code for device ${device.serial || device.device_serial}?`,
			variant: 'info'
		});
	};

	const executeDownloadQR = async () => {
		try {
			const svg = qrRef.current.querySelector('svg');
			if (!svg) {
				toast.error('QR code not found');
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
					toast.success('QR code image downloaded successfully');
				});
			};

			img.src = url;
		} catch (error) {
			console.error('Error downloading QR code:', error);
			toast.error('Failed to download QR code. Please try again.');
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
				<p className="modal-subtitle">Complete information and QR code for device registration</p>

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

				{/* QR Code Section */}
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
					<div className="qr-label">QR Code for</div>
					<div className="qr-device-name">{deviceSerial}</div>
					<p className="qr-description">Scan this QR code to register or identify the device</p>
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

											<label htmlFor="otp-code" style={{marginTop: '12px'}}>
												OTP Code
												<span style={{fontSize: '12px', color: '#666', fontWeight: 'normal', marginLeft: '8px'}}>
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
													<label htmlFor="collab-otp" style={{marginTop: '12px'}}>
														OTP Code
														<span style={{fontSize: '12px', color: '#666', fontWeight: 'normal', marginLeft: '8px'}}>
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
						Download QR Code
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

export default DeviceDetailsModal;
