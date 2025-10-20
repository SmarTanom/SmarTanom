import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
	LayoutDashboard,
	Home,
	Bell,
	Boxes,
	Plus,
	Users,
	Settings,
	Menu,
	X,
	UserCircle2
} from 'lucide-react';
import logoMarkWhite from '../../assets/images/logo-mark-white.png';

/**
 * AdminNavbar - Shared navbar component for all Admin pages
 * Desktop: Traditional sidebar
 * Mobile: Hamburger menu with slide-in drawer
 * 
 * @param {string} activePage - The current active page identifier
 */
export default function AdminNavbar({ activePage }) {
	const navigate = useNavigate();
	const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

	const navItems = [
		{ id: 'dashboard', path: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
		// User Dashboard moved to Settings page
		{ id: 'alerts', path: '/admin/alerts', icon: Bell, label: 'Alerts' },
		{ id: 'devices', path: '/admin/devices', icon: Boxes, label: 'Devices' },
		{ id: 'create', path: '/admin/create', icon: Plus, label: 'Create' },
		{ id: 'users', path: '/admin/users', icon: Users, label: 'Users' },
		{ id: 'settings', path: '/admin/settings', icon: Settings, label: 'Settings' }
	];

	// Close menu when navigating
	const handleNavigation = (path) => {
		navigate(path);
		setIsMobileMenuOpen(false);
	};

	// Close menu on escape key
	useEffect(() => {
		const handleEscape = (e) => {
			if (e.key === 'Escape' && isMobileMenuOpen) {
				setIsMobileMenuOpen(false);
			}
		};
		document.addEventListener('keydown', handleEscape);
		return () => document.removeEventListener('keydown', handleEscape);
	}, [isMobileMenuOpen]);

	// Prevent body scroll when menu is open
	useEffect(() => {
		if (isMobileMenuOpen) {
			document.body.style.overflow = 'hidden';
		} else {
			document.body.style.overflow = '';
		}
		return () => {
			document.body.style.overflow = '';
		};
	}, [isMobileMenuOpen]);

	return (
		<>
			{/* Desktop Sidebar */}
			<aside className="admin-sidebar" aria-label="Admin navigation">
				<div className="brand">
					<div className="brand-logo">
						<img src={logoMarkWhite} alt="SMARTANOM" />
					</div>
					<div className="brand-text">
						<div className="brand-name">SMARTANOM</div>
						<div className="brand-subtitle">Admin Dashboard</div>
					</div>
				</div>
				
				{/* Divider before menu */}
				<div className="nav-divider"></div>
				
				<div className="side-nav-label">MENU</div>
				<nav className="side-nav">
					{navItems.map((item) => {
						const Icon = item.icon;
						return (
							<button
								key={item.id}
								className={`side-link ${activePage === item.id ? 'active' : ''}`}
								onClick={() => navigate(item.path)}
							>
								<Icon size={18} />
								<span>{item.label}</span>
							</button>
						);
					})}
				</nav>
				
				{/* Divider before system status */}
				<div className="nav-divider"></div>
				
				<div className="system-status">
					<span className="status-dot online" />
					<div>
						<div className="status-title">System Online</div>
						<div className="status-sub">All services operational</div>
					</div>
				</div>
			</aside>

			{/* Mobile Top Bar */}
			<div className="admin-mobile-topbar">
				<button
					className="mobile-menu-toggle"
					onClick={() => setIsMobileMenuOpen(true)}
					aria-label="Open menu"
				>
					<Menu size={24} strokeWidth={2} />
				</button>
				
				<button
					className="mobile-user-button"
					onClick={() => navigate('/admin/settings')}
					aria-label="User settings"
				>
					<UserCircle2 size={28} strokeWidth={2} />
				</button>
			</div>

			{/* Mobile Menu Overlay */}
			<div
				className={`mobile-menu-overlay ${isMobileMenuOpen ? 'active' : ''}`}
				onClick={() => setIsMobileMenuOpen(false)}
				aria-hidden="true"
			/>

			{/* Mobile Slide-in Menu */}
			<aside
				className={`admin-mobile-menu ${isMobileMenuOpen ? 'active' : ''}`}
				aria-label="Mobile navigation"
			>
				{/* Menu Header */}
				<div className="mobile-menu-header">
					<div className="mobile-menu-brand">
						<div className="mobile-menu-logo">
							<img src={logoMarkWhite} alt="SMARTANOM" />
						</div>
						<div className="mobile-menu-brand-text">
							<div className="mobile-menu-brand-name">SMARTANOM</div>
							<div className="mobile-menu-brand-subtitle">Admin Dashboard</div>
						</div>
					</div>
					<button
						className="mobile-menu-close"
						onClick={() => setIsMobileMenuOpen(false)}
						aria-label="Close menu"
					>
						<X size={20} strokeWidth={2.5} />
					</button>
				</div>

				{/* Menu Navigation */}
				<nav className="mobile-menu-nav">
					<div className="mobile-menu-section">MENU</div>
					{navItems.map((item) => (
						<button
							key={item.id}
							className={`mobile-menu-item ${activePage === item.id ? 'active' : ''}`}
							onClick={() => handleNavigation(item.path)}
						>
							{item.label}
						</button>
					))}
				</nav>

				{/* Menu Footer - System Status */}
				<div className="mobile-menu-footer">
					<div className="mobile-system-status">
						<span className="mobile-status-dot online" />
						<div className="mobile-status-text">
							<div className="mobile-status-title">System Online</div>
							<div className="mobile-status-sub">All services operational</div>
						</div>
					</div>
				</div>
			</aside>
		</>
	);
}
