import React from 'react';
import { X, AlertTriangle } from 'lucide-react';
import '../assets/styles/ConfirmationModal.css';

function ConfirmationModal({
	isOpen,
	onClose,
	onConfirm,
	title = 'Confirm Action',
	message,
	confirmText = 'Confirm',
	cancelText = 'Cancel',
	variant = 'warning' // 'warning', 'danger', 'info'
}) {
	if (!isOpen) return null;

	const handleConfirm = () => {
		onConfirm();
		onClose();
	};

	return (
		<div className="confirmation-modal-overlay" onClick={onClose}>
			<div className="confirmation-modal-content" onClick={(e) => e.stopPropagation()}>
				<button className="confirmation-modal-close" onClick={onClose}>
					<X size={20} />
				</button>

				<div className={`confirmation-modal-icon ${variant}`}>
					<AlertTriangle size={48} />
				</div>

				<h2 className="confirmation-modal-title">{title}</h2>

				{message && <p className="confirmation-modal-message">{message}</p>}

				<div className="confirmation-modal-actions">
					<button
						className={`btn-confirm ${variant}`}
						onClick={handleConfirm}
					>
						{confirmText}
					</button>
					<button
						className="btn-cancel"
						onClick={onClose}
					>
						{cancelText}
					</button>
				</div>
			</div>
		</div>
	);
}

export default ConfirmationModal;
