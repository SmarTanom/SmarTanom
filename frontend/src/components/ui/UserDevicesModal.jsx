import React from 'react';
import { X, Smartphone, Activity, MapPin, Calendar, Loader2, Leaf, Zap, CheckCircle, AlertCircle } from 'lucide-react';
import '../../assets/styles/UserDevicesModal.css';

const UserDevicesModal = ({ user, devices, loading, onClose }) => {
	const formatDate = (dateString) => {
		if (!dateString) return 'Never';
		const date = new Date(dateString);
		const now = new Date();
		const diffMs = now - date;
		const diffMins = Math.floor(diffMs / 60000);
		const diffHours = Math.floor(diffMs / 3600000);
		const diffDays = Math.floor(diffMs / 86400000);

		if (diffMins < 1) return 'Just now';
		if (diffMins < 60) return `${diffMins}m ago`;
		if (diffHours < 24) return `${diffHours}h ago`;
		if (diffDays < 7) return `${diffDays}d ago`;

		return date.toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
		});
	};

	const getStatusBadge = (status) => {
		switch (status?.toLowerCase()) {
			case 'active':
				return {
					color: '#10b981',
					bg: '#d1fae5',
					icon: <CheckCircle size={14} />,
					text: 'Active'
				};
			case 'inactive':
				return {
					color: '#6b7280',
					bg: '#f3f4f6',
					icon: <AlertCircle size={14} />,
					text: 'Inactive'
				};
			case 'maintenance':
				return {
					color: '#f59e0b',
					bg: '#fef3c7',
					icon: <Zap size={14} />,
					text: 'Maintenance'
				};
			default:
				return {
					color: '#6b7280',
					bg: '#f3f4f6',
					icon: <AlertCircle size={14} />,
					text: 'Unknown'
				};
		}
	};

	const totalDevices = devices?.length || 0;
	const activeDevices = devices?.filter(d => d.status?.toLowerCase() === 'active').length || 0;
	const ownedDevices = devices?.filter(d => d.owner_email === user?.email).length || 0;
	const sharedDevices = totalDevices - ownedDevices;

	return (
		<div className="user-devices-modal-overlay" onClick={onClose}>
			<div className="user-devices-modal" onClick={(e) => e.stopPropagation()}>
				{/* Header */}
				<div className="modal-header">
					<div className="modal-header-content">
						<div className="modal-avatar">
							{user?.name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || '?'}
						</div>
						<div className="modal-title-section">
							<h2 className="modal-title">{user?.name || user?.email}</h2>
							<p className="modal-subtitle">
								{totalDevices} device{totalDevices !== 1 ? 's' : ''} • {activeDevices} active
								{sharedDevices > 0 && (
									<span className="modal-subtitle-shared">
										({ownedDevices} owned, {sharedDevices} shared)
									</span>
								)}
							</p>
						</div>
					</div>
					<button className="modal-close-btn" onClick={onClose} aria-label="Close modal">
						<X size={20} />
					</button>
				</div>

				{/* Content */}
				<div className="modal-content">
					{loading ? (
						<div className="loading-state">
							<Loader2 size={40} className="spinner" />
							<p className="loading-text">Loading devices...</p>
						</div>
					) : devices && devices.length > 0 ? (
						<div className="devices-grid">
							{devices.map((device, index) => {
								const statusBadge = getStatusBadge(device.status);
								return (
									<div
										key={device.id}
										className="device-card"
										style={{ animationDelay: `${index * 50}ms` }}
									>
										<div className="device-card-header">
											<div className="device-icon-wrapper">
												<Leaf size={22} strokeWidth={2.5} />
											</div>
											<div
												className="device-status-badge"
												style={{
													backgroundColor: statusBadge.bg,
													color: statusBadge.color
												}}
											>
												{statusBadge.icon}
												<span>{statusBadge.text}</span>
											</div>
										</div>

										<div className="device-card-body">
											<h3 className="device-title">
												{device.device_name || device.name || device.serial}
												{device.owner_email !== user?.email && (
													<span className="device-shared-badge">Shared</span>
												)}
											</h3>
											<p className="device-serial">
												<Smartphone size={14} />
												{device.device_serial || device.serial}
											</p>

											{device.plant_name && (
												<div className="device-plant-tag">
													<Leaf size={12} />
													{device.plant_name}
												</div>
											)}
										</div>

										<div className="device-card-footer">
											<div className="device-meta-item">
												<Activity size={14} />
												<span>{formatDate(device.last_seen || device.updated_at)}</span>
											</div>
											{device.location && (
												<div className="device-meta-item">
													<MapPin size={14} />
													<span>{device.location}</span>
												</div>
											)}
										</div>
									</div>
								);
							})}
						</div>
					) : (
						<div className="empty-state">
							<div className="empty-icon-wrapper">
								<Smartphone size={56} />
							</div>
							<h3 className="empty-title">No devices found</h3>
							<p className="empty-description">
								This user hasn't bound any devices to their account yet.
							</p>
						</div>
					)}
				</div>
			</div>
		</div>
	);
};

export default UserDevicesModal;
