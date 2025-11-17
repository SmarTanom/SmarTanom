import React, { useMemo, useRef, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../assets/styles/AdminLayout.css';
import '../assets/styles/AdminDashboard.css';
import AdminNavbar from '../components/admin/AdminNavbar';
import useAdminRealtimeStore from '../store/adminRealtimeStore';
import { wsClient } from '../services/websocketClient';
import GlobalLoadingSpinner from '../components/ui/GlobalLoadingSpinner.jsx';
import {
	CheckCircle2,
	Zap,
	Users,
	TrendingUp,
	Plus,
	Settings,
	User,
	AlertTriangle,
	Activity,
	BarChart2,
	Smartphone,
	Clock,
	Loader2,
	Eye,
	Wrench
} from 'lucide-react';
import {
	Chart as ChartJS,
	LineElement,
	PointElement,
	CategoryScale,
	LinearScale,
	Tooltip,
	Legend,
	Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(LineElement, PointElement, CategoryScale, LinearScale, Tooltip, Legend, Filler);

// Simple, self-contained line chart with gradient fill
function DeviceTrendChart({ labels = [], series = [], chartRef }) {
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
				pointRadius: 3,
				pointHoverRadius: 6,
				pointHitRadius: 10,
				tension: 0.35,
				borderWidth: 2
			}
		]
	};
	const options = {
		responsive: true,
		maintainAspectRatio: false,
		plugins: {
			legend: { display: false },
			tooltip: {
				intersect: false,
				mode: 'index',
				callbacks: {
					label: (ctx) => {
						const v = ctx.parsed.y ?? 0;
						return `${v} devices`;
					}
				}
			}
		},
		scales: {
			x: { grid: { display: false }, ticks: { color: '#6f8876', font: { weight: 600 } } },
			y: {
				grid: { color: 'rgba(139,167,151,0.15)' },
				ticks: { color: '#6f8876', font: { weight: 600 } },
				beginAtZero: true
			}
		}
	};
	return <Line ref={chartRef} data={data} options={options} height={220} />;
}

function Progress({ value = 0, label }) {
	const clamped = Math.min(100, Math.max(0, value));
	const minDisplayed = clamped > 0 && clamped < 4 ? 4 : clamped; // ensure visibility for tiny percentages
	// Color thresholds: low usage = green, medium = amber, high = red
	let color = '#2eb72e';
	if (clamped >= 70 && clamped < 85) color = '#f59e0b';
	else if (clamped >= 85) color = '#e11d48';
	return (
		<div className="progress-row" aria-label={label}>
			<div
				className="progress-bar"
				role="progressbar"
				aria-valuenow={clamped}
				aria-valuemin={0}
				aria-valuemax={100}
				data-usage={clamped}
			>
				<div
					className="progress-fill"
					style={{
						width: `${minDisplayed}%`,
						background: `linear-gradient(90deg, ${color}, ${color} 60%, ${color}CC)`
					}}
				/>
			</div>
			<span className="progress-value">{clamped.toFixed(1)}%</span>
		</div>
	);
}

export default function AdminDashboard() {
	const navigate = useNavigate();

	// Use admin realtime store
	const stats = useAdminRealtimeStore(state => state.adminStats);
	const loading = useAdminRealtimeStore(state => state.loadingStats);
	const error = useAdminRealtimeStore(state => state.errorStats);
	const fetchAdminStats = useAdminRealtimeStore(state => state.fetchAdminStats);
	const connectAdminWS = useAdminRealtimeStore(state => state.connectAdminWS);
	const setWsStatus = useAdminRealtimeStore(state => state.setWsStatus);

	useEffect(() => {
		// Fetch initial data
		fetchAdminStats();

		// Connect to WebSocket
		wsClient.connect();
		const unsubscribeWS = connectAdminWS();

		// Subscribe to WebSocket status changes
		const unsubscribeStatus = wsClient.onStatusChange((status) => {
			setWsStatus(status);
		});

		// Cleanup on unmount
		return () => {
			unsubscribeWS();
			unsubscribeStatus();
		};
	}, [fetchAdminStats, connectAdminWS, setWsStatus]);

	// Extract data needed for hooks (safe defaults for early returns)
	const trendLabels = stats?.device_trend?.map(d => d.month) || [];
	const trendData = stats?.device_trend?.map(d => d.count) || [];

	// Range selector state and memoized slices must be declared before any early return
	const [chartRange, setChartRange] = useState('12m'); // '3m' | '6m' | '12m' | 'all'
	const chartRef = useRef(null);
	const { rangeLabels, rangeSeries } = useMemo(() => {
		const allLabels = Array.isArray(trendLabels) ? trendLabels : [];
		const allSeries = Array.isArray(trendData) ? trendData : [];
		const map = { '3m': 3, '6m': 6, '12m': 12 };
		if (chartRange === 'all' || allLabels.length === 0) {
			return { rangeLabels: allLabels, rangeSeries: allSeries };
		}
		const n = map[chartRange] ?? 12;
		return {
			rangeLabels: allLabels.slice(-n),
			rangeSeries: allSeries.slice(-n)
		};
	}, [chartRange, trendLabels, trendData]);
	const kpis = useMemo(() => {
		if (!rangeSeries || rangeSeries.length === 0) return { min: 0, max: 0, avg: 0 };
		const min = Math.min(...rangeSeries);
		const max = Math.max(...rangeSeries);
		const avg = rangeSeries.reduce((a, b) => a + b, 0) / rangeSeries.length;
		return { min, max, avg: Number.isFinite(avg) ? avg : 0 };
	}, [rangeSeries]);

	// Show loading state AFTER declaring hooks to preserve hook order
	if (loading) {
		return (
			<div className="admin-root">
				<AdminNavbar activePage="dashboard" />
				<main className="admin-main" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
					<GlobalLoadingSpinner message="Loading dashboard data..." />
				</main>
			</div>
		);
	}

	// Show error state AFTER declaring hooks to preserve hook order
	if (error) {
		return (
			<div className="admin-root">
				<AdminNavbar activePage="dashboard" />
				<main className="admin-main" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
					<div style={{ textAlign: 'center', maxWidth: '400px' }}>
						<AlertTriangle size={48} style={{ color: '#ef4444' }} />
						<p style={{ marginTop: '16px', color: '#dc2626', fontWeight: 600 }}>{error}</p>
						<button
							onClick={() => fetchAdminStats()}
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

	// Extract data from stats for rest of UI
	const summary = {
		totalDevices: stats?.summary?.devices?.total || 0,
		activeDevices: stats?.summary?.devices?.active || 0,
		availableUnits: stats?.summary?.devices?.available || 0,
		activeUsers: stats?.summary?.users?.active || 0,
		growth: {
			devices: stats?.summary?.growth?.devices || 0,
			units: stats?.summary?.growth?.devices || 0,
			users: stats?.summary?.growth?.users || 0,
			total: stats?.summary?.growth?.devices || 0
		}
	};


	const alerts = stats?.alerts || { critical: 0, warning: 0, info: 0 };
	const performance = stats?.performance || { cpu_usage: 0, memory_usage: 0, disk_usage: 0 };
	// Error reports panel removed; related stats omitted

	// Calculate utilization percentages
	const capacityUtilization = summary.totalDevices > 0
		? ((summary.totalDevices - summary.availableUnits) / summary.totalDevices * 100).toFixed(0)
		: 0;

	const assignedPercentage = summary.totalDevices > 0
		? (summary.activeDevices / summary.totalDevices * 100).toFixed(0)
		: 0;

	const availablePercentage = summary.totalDevices > 0
		? (summary.availableUnits / summary.totalDevices * 100).toFixed(0)
		: 0;

	const userEngagement = summary.activeUsers > 0 ? 55 : 0; // Placeholder calculation

	return (
		<div className="admin-root">
			{/* Sidebar and Bottom Nav */}
			<AdminNavbar activePage="dashboard" />

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
							<div className="fill" style={{ width: `${capacityUtilization}%` }} />
						</div>
						<div className="summary-caption">{capacityUtilization}% capacity utilization</div>
					</article>

					<article className="summary-card">
						<div className="icon-wrapper green"><CheckCircle2 size={24} /></div>
						<div className="summary-growth"><TrendingUp size={14} /> <span>+{summary.growth.devices}%</span></div>
						<h3 className="summary-title">Active Devices</h3>
						<div className="summary-value">{summary.activeDevices}</div>
						<div className="summary-progress">
							<div className="fill" style={{ width: `${assignedPercentage}%` }} />
						</div>
						<div className="summary-caption">{assignedPercentage}% currently assigned</div>
					</article>

					<article className="summary-card">
						<div className="icon-wrapper yellow"><Zap size={24} /></div>
						<div className="summary-growth"><TrendingUp size={14} /> <span>+{summary.growth.units}%</span></div>
						<h3 className="summary-title">Available Units</h3>
						<div className="summary-value">{summary.availableUnits}</div>
						<div className="summary-progress">
							<div className="fill" style={{ width: `${availablePercentage}%` }} />
						</div>
						<div className="summary-caption">Ready for deployment</div>
					</article>

					<article className="summary-card">
						<div className="icon-wrapper cyan"><Users size={24} /></div>
						<div className="summary-growth"><TrendingUp size={14} /> <span>+{summary.growth.users}%</span></div>
						<h3 className="summary-title">Active Users</h3>
						<div className="summary-value">{summary.activeUsers}</div>
						<div className="summary-progress">
							<div className="fill" style={{ width: `${userEngagement}%` }} />
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
							<div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
								<div className="btn-group" role="group" aria-label="Chart range selector" style={{ background: '#f3f7f5', borderRadius: 999, padding: 2 }}>
									{[
										{ key: '3m', label: '3m' },
										{ key: '6m', label: '6m' },
										{ key: '12m', label: '12m' },
										{ key: 'all', label: 'All' }
									].map(btn => (
										<button
											key={btn.key}
											type="button"
											onClick={() => setChartRange(btn.key)}
											style={{
												border: 'none',
												background: chartRange === btn.key ? '#ffffff' : 'transparent',
												color: '#0d3923',
												padding: '6px 10px',
												borderRadius: 999,
												cursor: 'pointer',
												fontWeight: 600
											}}
										>
											{btn.label}
										</button>
									))}
								</div>
								<button
									className="export-btn"
									type="button"
									onClick={() => {
										const chart = chartRef.current;
										if (!chart) return;
										const url = chart.toBase64Image ? chart.toBase64Image() : chart.canvas?.toDataURL?.('image/png');
										if (!url) return;
										const a = document.createElement('a');
										a.href = url;
										a.download = 'device-usage-trend.png';
										a.click();
									}}
								>
									<BarChart2 size={16} />
									<span>Export</span>
								</button>
							</div>
						</header>
						<div className="panel-body">
							{(rangeSeries && rangeSeries.length > 0) ? (
								<>
									<div style={{ display: 'flex', gap: 12, marginBottom: 10 }}>
										<div className="kpi-chip" title="Minimum">
											<span style={{ color: '#6f8876', fontWeight: 600 }}>Min</span>
											<strong style={{ marginLeft: 6 }}>{kpis.min}</strong>
										</div>
										<div className="kpi-chip" title="Average">
											<span style={{ color: '#6f8876', fontWeight: 600 }}>Avg</span>
											<strong style={{ marginLeft: 6 }}>{kpis.avg.toFixed(1)}</strong>
										</div>
										<div className="kpi-chip" title="Maximum">
											<span style={{ color: '#6f8876', fontWeight: 600 }}>Max</span>
											<strong style={{ marginLeft: 6 }}>{kpis.max}</strong>
										</div>
									</div>
									<div style={{ height: 260 }}>
										<DeviceTrendChart labels={rangeLabels} series={rangeSeries} chartRef={chartRef} />
									</div>
								</>
							) : (
								<div style={{ padding: '24px 8px', color: '#6f8876' }}>No trend data available.</div>
							)}
						</div>
					</article>

					<article className="panel">
						<header className="panel-head">
							<div className="panel-title">
								<Wrench size={18} />
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
							<button className="view-all" onClick={() => navigate('/admin/alerts')}>
								<Eye size={16} />
								View All
							</button>
						</header>
						<div className="alerts-list">
							{alerts.critical > 0 && (
								<div className="alert-card critical">
									<div className="alert-meta"><Clock size={14} /> Recent</div>
									<div className="alert-title">Critical Alerts</div>
									<div className="alert-desc">{alerts.critical} critical {alerts.critical === 1 ? 'alert' : 'alerts'} requiring immediate attention</div>
									<span className="alert-badge">Critical</span>
								</div>
							)}
							{alerts.warning > 0 && (
								<div className="alert-card warning">
									<div className="alert-meta"><Clock size={14} /> Recent</div>
									<div className="alert-title">Warning Alerts</div>
									<div className="alert-desc">{alerts.warning} warning {alerts.warning === 1 ? 'alert' : 'alerts'} detected in the system</div>
									<span className="alert-badge">Warning</span>
								</div>
							)}
							{alerts.info > 0 && (
								<div className="alert-card info">
									<div className="alert-meta"><Clock size={14} /> Recent</div>
									<div className="alert-title">Info Alerts</div>
									<div className="alert-desc">{alerts.info} informational {alerts.info === 1 ? 'alert' : 'alerts'} for your review</div>
									<span className="alert-badge">Info</span>
								</div>
							)}
							{alerts.critical === 0 && alerts.warning === 0 && alerts.info === 0 && (
								<div style={{ padding: '32px', textAlign: 'center', color: '#6f8876' }}>
									<CheckCircle2 size={32} style={{ color: '#339432', margin: '0 auto 8px' }} />
									<p>No active alerts</p>
								</div>
							)}
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
									<span>CPU Usage</span>
									<Progress value={performance.cpu_usage} label="CPU Usage" />
								</div>
								<div className="perf-row">
									<span>Memory Usage</span>
									<Progress value={performance.memory_usage} label="Memory Usage" />
								</div>
								<div className="perf-row">
									<span>Disk Usage</span>
									<Progress value={performance.disk_usage} label="Disk Usage" />
								</div>
							</div>
							<div className="grade-card">
								<div>
									<div className="grade-title">Overall Health Score</div>
									<div className="grade-sub">
										{performance.cpu_usage < 70 && performance.memory_usage < 70 && performance.disk_usage < 70
											? 'Excellent system performance'
											: performance.cpu_usage < 85 && performance.memory_usage < 85 && performance.disk_usage < 85
												? 'Good system performance'
												: 'System needs attention'}
									</div>
								</div>
								<div className="grade-badge">
									{performance.cpu_usage < 70 && performance.memory_usage < 70 && performance.disk_usage < 70
										? 'A+'
										: performance.cpu_usage < 85 && performance.memory_usage < 85 && performance.disk_usage < 85
											? 'B'
											: 'C'}
								</div>
							</div>
						</div>
					</article>

					{/* Error Reports panel removed per request */}
				</section>
			</main>
		</div>
	);
}
