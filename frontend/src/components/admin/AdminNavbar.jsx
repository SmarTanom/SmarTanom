import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
	LayoutDashboard,
	Home,
	Bell,
	Boxes,
	Plus,
	Users,
	Settings
} from 'lucide-react';
import logoMarkWhite from '../../assets/images/logo-mark-white.png';

/**
 * AdminNavbar - Shared navbar component for all Admin pages
 * Ensures consistent navigation order, styling, and active states across:
 * - Dashboard, Alerts, Devices, Create, Users, Settings
 * 
 * @param {string} activePage - The current active page identifier
 */
export default function AdminNavbar({ activePage }) {
	const navigate = useNavigate();

	const navItems = [
		{ id: 'dashboard', path: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
		{ id: 'user-dashboard', path: '/dashboard', icon: Home, label: 'User Dashboard' },
		{ id: 'alerts', path: '/admin/alerts', icon: Bell, label: 'Alerts' },
		{ id: 'devices', path: '/admin/devices', icon: Boxes, label: 'Devices' },
		{ id: 'create', path: '/admin/create', icon: Plus, label: 'Create' },
		{ id: 'users', path: '/admin/users', icon: Users, label: 'Users' },
		{ id: 'settings', path: '/admin/settings', icon: Settings, label: 'Settings' }
	];

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

			{/* Mobile Bottom Navigation */}
			<nav className="admin-bottom-nav" aria-label="Admin primary">
				{navItems.map((item) => {
					// Skip "User Dashboard" in mobile view for space
					if (item.id === 'user-dashboard') return null;

					const Icon = item.icon;
					return (
						<button
							key={item.id}
							className={`bn-item ${activePage === item.id ? 'active' : ''}`}
							onClick={() => navigate(item.path)}
						>
							<Icon size={20} />
							<span>{item.label}</span>
						</button>
					);
				})}
			</nav>
		</>
	);
}
