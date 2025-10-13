import React, { useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../assets/styles/AdminDashboard.css';
import logoMarkWhite from '../assets/images/logo-mark-white.png';
import {
	LayoutDashboard,
	Boxes,
	CheckCircle2,
	Zap,
	Users,
	TrendingUp,
	Plus,
	Settings,
	User,
	Bell,
	AlertTriangle,
	Info,
	Activity,
	BarChart2,
	Smartphone,
	Clock
} from 'lucide-react';
import {
	Chart as ChartJS,
	LineElement,
	PointElement,
	BarElement,
	CategoryScale,
	LinearScale,
	Tooltip,
	Legend,
	Filler
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';

ChartJS.register(LineElement, PointElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend, Filler);

// Simple, self-contained sparkline/line path based on data points
function DeviceTrendChart({ labels = [], series = [] }) {
	const safeLabels = Array.isArray(labels) ? labels : [];
	const safeSeries = Array.isArray(series) ? series : [];
	const data = {
		labels: safeLabels,
		datasets: [
			{
				data: safeSeries,
				borderColor: '#339432',
				backgroundColor: (context) => {
					const { ctx, chartArea } = context.chart;
					if (!chartArea) return 'rgba(51,148,50,0.15)'; // fallback during initial layout
					const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
					gradient.addColorStop(0, 'rgba(51,148,50,0.35)');
					gradient.addColorStop(1, 'rgba(51,148,50,0.05)');
					return gradient;
				},
				fill: true,
				pointRadius: 4,
				pointHoverRadius: 5,
				tension: 0.35,
				borderWidth: 3
			}
		]
	};
	const options = {
		responsive: true,
		maintainAspectRatio: false,
		plugins: { legend: { display: false }, tooltip: { intersect: false, mode: 'index' } },
		scales: {
			x: { grid: { display: false }, ticks: { color: '#6f8876', font: { weight: 600 } } },
			y: {
				grid: { color: 'rgba(139,167,151,0.15)' },
				ticks: { color: '#6f8876', font: { weight: 600 } }
			}
		}
	};
	return <Line data={data} options={options} height={220} />;
}

function Progress({ value = 0, label }) {
	return (
		<div className="progress-row" aria-label={label}>
			<div className="progress-bar">
				<div className="progress-fill" style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
			</div>
			<span className="progress-value">{value.toFixed(1)}%</span>
		</div>
	);
}

export default function AdminDashboard() {
	const navigate = useNavigate();

	// Mock summary data (can be wired to API later)
	const summary = {
		totalDevices: 127,
		activeDevices: 89,
		availableUnits: 38,
		activeUsers: 64,
		growth: { devices: 8, units: 5, users: 15, total: 12 }
	};

		const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
		const trendData = [15, 22, 34, 44, 40, 46, 45, 60, 58, 70, 65, 85];
		const errorData = [2, 1, 3, 1, 3, 5, 0, 0, 0, 0, 0, 0];

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
					<button className="side-link active" onClick={() => navigate('/admin')}>
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
				<header className="admin-header">
					<h1 className="admin-title">Admin Dashboard</h1>
					<p className="admin-sub">System overview and analytics</p>
				</header>

				{/* Top summary cards */}
						<section className="summary-grid" aria-label="Top summary cards">
					<article className="summary-card">
						<div className="icon-wrapper green"><Smartphone size={24} /></div>
						<div className="summary-growth"><TrendingUp size={14} /> <span>+{summary.growth.total}%</span></div>
						<h3 className="summary-title">Total Devices</h3>
						<div className="summary-value">{summary.totalDevices}</div>
						<div className="summary-progress">
							<div className="fill" style={{ width: '85%' }} />
						</div>
						<div className="summary-caption">85% capacity utilization</div>
					</article>

					<article className="summary-card">
						<div className="icon-wrapper green"><CheckCircle2 size={24} /></div>
						<div className="summary-growth"><TrendingUp size={14} /> <span>+{summary.growth.devices}%</span></div>
						<h3 className="summary-title">Active Devices</h3>
						<div className="summary-value">{summary.activeDevices}</div>
						<div className="summary-progress">
							<div className="fill" style={{ width: '70%' }} />
						</div>
						<div className="summary-caption">70% currently assigned</div>
					</article>

					<article className="summary-card">
						<div className="icon-wrapper yellow"><Zap size={24} /></div>
						<div className="summary-growth"><TrendingUp size={14} /> <span>+{summary.growth.units}%</span></div>
						<h3 className="summary-title">Available Units</h3>
						<div className="summary-value">{summary.availableUnits}</div>
						<div className="summary-progress">
							<div className="fill" style={{ width: '20%' }} />
						</div>
						<div className="summary-caption">Ready for deployment</div>
					</article>

					<article className="summary-card">
						<div className="icon-wrapper cyan"><Users size={24} /></div>
						<div className="summary-growth"><TrendingUp size={14} /> <span>+{summary.growth.users}%</span></div>
						<h3 className="summary-title">Active Users</h3>
						<div className="summary-value">{summary.activeUsers}</div>
						<div className="summary-progress">
							<div className="fill" style={{ width: '55%' }} />
						</div>
						<div className="summary-caption">Growing user base</div>
					</article>
				</section>

				{/* Middle grid */}
				<section className="middle-grid">
					<article className="panel">
						<header className="panel-head">
							<div className="panel-title">
										<Activity size={18} />
								<span>Device Usage Trend</span>
							</div>
									<button className="export-btn" type="button" onClick={() => window.alert('Exporting...')}>{/* placeholder */}
										<BarChart2 size={16} />
										<span>Export</span>
									</button>
						</header>
						<div className="panel-body">
									<div style={{ height: 260 }}>
										<DeviceTrendChart labels={months} series={trendData} />
									</div>
						</div>
					</article>

					<article className="panel">
						<header className="panel-head">
							<div className="panel-title">
								<WrenchIcon />
								<span>Quick Actions</span>
							</div>
						</header>
						<div className="quick-actions">
							<button className="qa-btn" onClick={() => navigate('/admin/create')}>
								<Plus size={20} /> Add New Device
							</button>
							<button className="qa-btn" onClick={() => navigate('/admin/users')}>
								<User size={20} /> Manage Users
							</button>
							<button className="qa-btn" onClick={() => navigate('/admin/settings')}>
								<Settings size={20} /> System Settings
							</button>
						</div>
					</article>
				</section>

				{/* Lower grid */}
				<section className="lower-grid">
								<article className="panel alerts">
						<header className="panel-head">
							<div className="panel-title">
											<AlertTriangle size={18} />
								<span>System Alerts</span>
							</div>
							<button className="view-all" onClick={() => navigate('/admin/devices')}>View All</button>
						</header>
						<div className="alerts-list">
							<div className="alert-card critical">
											<div className="alert-meta"><Clock size={14} /> 2 hours ago</div>
								<div className="alert-title">Device HYD-SPN-012-2025 offline</div>
								<div className="alert-desc">Connection lost during routine monitoring cycle</div>
								<span className="alert-badge">Critical</span>
							</div>
							<div className="alert-card warning">
											<div className="alert-meta"><Clock size={14} /> 45 minutes ago</div>
								<div className="alert-title">High pH level detected</div>
								<div className="alert-desc">Device HYD-SPN-034-2025 readings above threshold</div>
								<span className="alert-badge">Warning</span>
							</div>
							<div className="alert-card info">
											<div className="alert-meta"><Clock size={14} /> 1 hour ago</div>
								<div className="alert-title">New device registration</div>
								<div className="alert-desc">HYD-SPN-045-2025 registered by farmer@hydro.com</div>
								<span className="alert-badge">Info</span>
							</div>
						</div>
					</article>

					<article className="panel performance">
						<header className="panel-head">
							<div className="panel-title">
								<Activity size={18} />
								<span>System Performance</span>
							</div>
						</header>
						<div className="panel-body">
							<div className="perf-rows">
								<div className="perf-row">
									<span>System Uptime</span>
									<Progress value={99.8} label="Uptime" />
								</div>
								<div className="perf-row">
									<span>Data Accuracy</span>
									<Progress value={97.2} label="Accuracy" />
								</div>
								<div className="perf-row">
									<span>Device Health</span>
									<Progress value={94.5} label="Device Health" />
								</div>
							</div>
							<div className="grade-card">
								<div>
									<div className="grade-title">Overall Health Score</div>
									<div className="grade-sub">Excellent system performance</div>
								</div>
								<div className="grade-badge">A+</div>
							</div>
						</div>
					</article>

								<article className="panel">
						<header className="panel-head">
							<div className="panel-title">
								<BarChart2 size={18} />
								<span>Error Reports</span>
							</div>
						</header>
									<div className="panel-body" style={{ height: 240 }}>
														<Bar
															data={{
																labels: Array.isArray(months) ? months : [],
																datasets: [
																	{
																		label: 'Errors',
																		data: Array.isArray(errorData) ? errorData : [],
																		backgroundColor: 'rgba(239, 68, 68, 0.85)',
																		borderColor: 'rgba(239, 68, 68, 1)',
																		borderWidth: 1,
																		borderRadius: 8,
																		barThickness: 22
																	}
																]
															}}
											options={{
												responsive: true,
												maintainAspectRatio: false,
												plugins: { legend: { display: false }, tooltip: { mode: 'index', intersect: false } },
												scales: {
													x: { grid: { display: false }, ticks: { color: '#6f8876', font: { weight: 600 } } },
													y: { grid: { color: 'rgba(139,167,151,0.15)' }, ticks: { color: '#6f8876', font: { weight: 600 } } }
												}
											}}
										/>
									</div>
					</article>
				</section>
			</main>

			{/* Bottom navigation (mobile) */}
			<nav className="admin-bottom-nav" aria-label="Admin primary">
				<button className="bn-item active" onClick={() => navigate('/admin')}>
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
				<button className="bn-item" onClick={() => navigate('/admin/users')}>
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

// Small inline icon to avoid importing more libs
function WrenchIcon() {
	return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M14.7 6.3a4.98 4.98 0 0 1-1.12 5.32l-5.96 5.96a2 2 0 0 1-2.83-2.83l5.96-5.96A4.98 4.98 0 0 1 15.7 4.3a3 3 0 1 0 3.99 3.99 4.98 4.98 0 0 1-4.99-1.99z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}
