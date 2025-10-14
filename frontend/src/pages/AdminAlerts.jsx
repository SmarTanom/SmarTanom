import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  Search,
  Filter,
  Eye,
  CheckCircle2,
  Clock,
  XCircle,
  Info,
  AlertCircle,
  ChevronDown,
  X,
  LayoutDashboard,
  Boxes,
  Plus,
  Users,
  Settings,
  Loader2,
  Bell
} from 'lucide-react';
import useAdminRealtimeStore from '../store/adminRealtimeStore';
import logoMarkWhite from '../assets/images/logo-mark-white.png';
import '../assets/styles/AdminLayout.css';
import '../assets/styles/AdminAlerts.css';

export default function AdminAlerts() {
  const navigate = useNavigate();
  const stats = useAdminRealtimeStore((state) => state.adminStats);

  // State management
  const [searchQuery, setSearchQuery] = useState('');
  const [deviceFilter, setDeviceFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Mock alerts data - in production, this would come from API/WebSocket
  const [alerts, setAlerts] = useState([
    {
      id: 1,
      type: 'critical',
      device: 'Reservoir Tank A',
      deviceId: 'DEV001',
      title: 'Critical Water Level',
      message: 'Water level has dropped below critical threshold (10%). Immediate action required.',
      timestamp: new Date(Date.now() - 30 * 60000), // 30 mins ago
      status: 'unread',
      resolved: false
    },
    {
      id: 2,
      type: 'warning',
      device: 'Sensor Hub B',
      deviceId: 'DEV002',
      title: 'Sensor Connectivity Issue',
      message: 'Intermittent connection detected. Signal strength below optimal range.',
      timestamp: new Date(Date.now() - 2 * 3600000), // 2 hours ago
      status: 'unread',
      resolved: false
    },
    {
      id: 3,
      type: 'info',
      device: 'Smart Monitor C',
      deviceId: 'DEV003',
      title: 'Maintenance Schedule',
      message: 'Routine maintenance is due in 7 days. Schedule service to ensure optimal performance.',
      timestamp: new Date(Date.now() - 24 * 3600000), // 1 day ago
      status: 'read',
      resolved: false
    },
    {
      id: 4,
      type: 'critical',
      device: 'Pump Station D',
      deviceId: 'DEV004',
      title: 'Pump Failure Detected',
      message: 'Primary pump has stopped responding. Backup pump activated automatically.',
      timestamp: new Date(Date.now() - 15 * 60000), // 15 mins ago
      status: 'unread',
      resolved: false
    },
    {
      id: 5,
      type: 'warning',
      device: 'Flow Meter E',
      deviceId: 'DEV005',
      title: 'Abnormal Flow Rate',
      message: 'Flow rate exceeds normal parameters. Possible leak or malfunction detected.',
      timestamp: new Date(Date.now() - 6 * 3600000), // 6 hours ago
      status: 'read',
      resolved: true
    }
  ]);

  // Filter alerts based on all criteria
  const filteredAlerts = alerts.filter(alert => {
    // Search filter
    const matchesSearch = searchQuery === '' ||
      alert.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      alert.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
      alert.device.toLowerCase().includes(searchQuery.toLowerCase());

    // Device filter
    const matchesDevice = deviceFilter === 'all' || alert.deviceId === deviceFilter;

    // Type filter
    const matchesType = typeFilter === 'all' || alert.type === typeFilter;

    // Status filter
    let matchesStatus = true;
    if (statusFilter === 'unread') matchesStatus = alert.status === 'unread';
    else if (statusFilter === 'read') matchesStatus = alert.status === 'read';
    else if (statusFilter === 'resolved') matchesStatus = alert.resolved === true;
    else if (statusFilter === 'active') matchesStatus = alert.resolved === false;

    // Date filter
    let matchesDate = true;
    const now = Date.now();
    const alertTime = alert.timestamp.getTime();
    if (dateFilter === 'today') {
      matchesDate = now - alertTime < 24 * 3600000;
    } else if (dateFilter === 'week') {
      matchesDate = now - alertTime < 7 * 24 * 3600000;
    } else if (dateFilter === 'month') {
      matchesDate = now - alertTime < 30 * 24 * 3600000;
    }

    return matchesSearch && matchesDevice && matchesType && matchesStatus && matchesDate;
  });

  // Get unique devices for filter dropdown
  const devices = [...new Set(alerts.map(a => ({ id: a.deviceId, name: a.device })))];

  // Calculate filter counts
  const counts = {
    all: alerts.length,
    critical: alerts.filter(a => a.type === 'critical').length,
    warning: alerts.filter(a => a.type === 'warning').length,
    info: alerts.filter(a => a.type === 'info').length,
    unread: alerts.filter(a => a.status === 'unread').length,
    resolved: alerts.filter(a => a.resolved).length,
    active: alerts.filter(a => !a.resolved).length
  };

  // Format timestamp
  const formatTime = (timestamp) => {
    const now = Date.now();
    const diff = now - timestamp.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / (24 * 3600000));

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return timestamp.toLocaleDateString();
  };

  // Get alert icon based on type
  const getAlertIcon = (type) => {
    switch (type) {
      case 'critical':
        return <AlertTriangle size={20} />;
      case 'warning':
        return <AlertCircle size={20} />;
      case 'info':
        return <Info size={20} />;
      default:
        return <AlertTriangle size={20} />;
    }
  };

  // Handle mark as read
  const markAsRead = (alertId) => {
    setAlerts(prev => prev.map(alert =>
      alert.id === alertId ? { ...alert, status: 'read' } : alert
    ));
  };

  // Handle mark as resolved
  const markAsResolved = (alertId) => {
    setAlerts(prev => prev.map(alert =>
      alert.id === alertId ? { ...alert, resolved: true, status: 'read' } : alert
    ));
    setShowDetailModal(false);
  };

  // Handle view details
  const viewDetails = (alert) => {
    setSelectedAlert(alert);
    setShowDetailModal(true);
    if (alert.status === 'unread') {
      markAsRead(alert.id);
    }
  };

  // Close modal
  const closeModal = () => {
    setShowDetailModal(false);
    setSelectedAlert(null);
  };

  return (
    <div className="admin-root">
      {/* Sidebar navigation (desktop) */}
      <aside className="admin-sidebar" aria-label="Admin sidebar">
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
          <button className="side-link active" onClick={() => navigate('/admin/alerts')}>
            <Bell size={18} />
            <span>Alerts</span>
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
      <div className="admin-alerts-page">
        {/* Header */}
        <header className="alerts-page-header">
          <div className="header-top">
            <div>
              <h1 className="page-title">System Alerts</h1>
              <p className="page-subtitle">Monitor and manage all system notifications</p>
            </div>
            <div className="header-stats">
              <div className="stat-badge critical">
                <AlertTriangle size={16} />
                <span>{counts.critical} Critical</span>
              </div>
              <div className="stat-badge warning">
                <AlertCircle size={16} />
                <span>{counts.warning} Warnings</span>
              </div>
              <div className="stat-badge info">
                <Info size={16} />
                <span>{counts.info} Info</span>
              </div>
            </div>
          </div>

          {/* Search Bar */}
          <div className="search-bar">
            <Search size={18} />
            <input
              type="text"
              placeholder="Search alerts by title, message, or device..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button className="clear-search" onClick={() => setSearchQuery('')}>
                <X size={16} />
              </button>
            )}
          </div>
        </header>

        {/* Filter Section */}
        <section className="filters-section">
          {/* Type Filters */}
          <div className="filter-group">
            <label className="filter-label">
              <Filter size={14} />
              Type
            </label>
            <div className="filter-tabs">
              <button
                className={`filter-tab ${typeFilter === 'all' ? 'active' : ''}`}
                onClick={() => setTypeFilter('all')}
              >
                All ({counts.all})
              </button>
              <button
                className={`filter-tab critical ${typeFilter === 'critical' ? 'active' : ''}`}
                onClick={() => setTypeFilter('critical')}
              >
                Critical ({counts.critical})
              </button>
              <button
                className={`filter-tab warning ${typeFilter === 'warning' ? 'active' : ''}`}
                onClick={() => setTypeFilter('warning')}
              >
                Warning ({counts.warning})
              </button>
              <button
                className={`filter-tab info ${typeFilter === 'info' ? 'active' : ''}`}
                onClick={() => setTypeFilter('info')}
              >
                Info ({counts.info})
              </button>
            </div>
          </div>

          {/* Status Filters */}
          <div className="filter-group">
            <label className="filter-label">Status</label>
            <div className="filter-tabs">
              <button
                className={`filter-tab ${statusFilter === 'all' ? 'active' : ''}`}
                onClick={() => setStatusFilter('all')}
              >
                All
              </button>
              <button
                className={`filter-tab ${statusFilter === 'unread' ? 'active' : ''}`}
                onClick={() => setStatusFilter('unread')}
              >
                Unread ({counts.unread})
              </button>
              <button
                className={`filter-tab ${statusFilter === 'active' ? 'active' : ''}`}
                onClick={() => setStatusFilter('active')}
              >
                Active ({counts.active})
              </button>
              <button
                className={`filter-tab ${statusFilter === 'resolved' ? 'active' : ''}`}
                onClick={() => setStatusFilter('resolved')}
              >
                Resolved ({counts.resolved})
              </button>
            </div>
          </div>

          {/* Advanced Filters */}
          <div className="filter-group inline">
            <div className="filter-dropdown">
              <label>Device</label>
              <select value={deviceFilter} onChange={(e) => setDeviceFilter(e.target.value)}>
                <option value="all">All Devices</option>
                {devices.map(device => (
                  <option key={device.id} value={device.id}>{device.name}</option>
                ))}
              </select>
            </div>

            <div className="filter-dropdown">
              <label>Time Range</label>
              <select value={dateFilter} onChange={(e) => setDateFilter(e.target.value)}>
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
              </select>
            </div>
          </div>
        </section>

        {/* Alerts List */}
        <section className="alerts-list-section">
          <div className="list-header">
            <h2 className="list-title">
              {filteredAlerts.length} {filteredAlerts.length === 1 ? 'Alert' : 'Alerts'}
            </h2>
          </div>

          <div className="alerts-grid">
            {filteredAlerts.length > 0 ? (
              filteredAlerts.map(alert => (
                <article
                  key={alert.id}
                  className={`alert-item ${alert.type} ${alert.status === 'unread' ? 'unread' : ''} ${alert.resolved ? 'resolved' : ''}`}
                  onClick={() => viewDetails(alert)}
                >
                  <div className="alert-icon-wrapper">
                    {getAlertIcon(alert.type)}
                  </div>

                  <div className="alert-content">
                    <div className="alert-header">
                      <h3 className="alert-title">{alert.title}</h3>
                      <div className="alert-badges">
                        {alert.status === 'unread' && (
                          <span className="badge unread-badge">New</span>
                        )}
                        {alert.resolved && (
                          <span className="badge resolved-badge">
                            <CheckCircle2 size={12} />
                            Resolved
                          </span>
                        )}
                        <span className={`badge type-badge ${alert.type}`}>
                          {alert.type.charAt(0).toUpperCase() + alert.type.slice(1)}
                        </span>
                      </div>
                    </div>

                    <p className="alert-message">{alert.message}</p>

                    <div className="alert-footer">
                      <span className="alert-device">{alert.device}</span>
                      <span className="alert-time">
                        <Clock size={14} />
                        {formatTime(alert.timestamp)}
                      </span>
                    </div>
                  </div>

                  <button
                    className="view-detail-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      viewDetails(alert);
                    }}
                  >
                    <Eye size={18} />
                  </button>
                </article>
              ))
            ) : (
              <div className="empty-state">
                <CheckCircle2 size={48} />
                <h3>No Alerts Found</h3>
                <p>
                  {searchQuery
                    ? 'No alerts match your search criteria. Try adjusting your filters.'
                    : 'All clear! No alerts to display at the moment.'}
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Detail Modal */}
        {showDetailModal && selectedAlert && (
          <div className="modal-overlay" onClick={closeModal}>
            <div className="modal-content alert-detail-modal" onClick={(e) => e.stopPropagation()}>
              <button className="modal-close" onClick={closeModal}>
                <X size={20} />
              </button>

              <div className={`modal-header ${selectedAlert.type}`}>
                <div className="modal-icon">
                  {getAlertIcon(selectedAlert.type)}
                </div>
                <div>
                  <h2 className="modal-title">{selectedAlert.title}</h2>
                  <div className="modal-badges">
                    <span className={`badge type-badge ${selectedAlert.type}`}>
                      {selectedAlert.type.charAt(0).toUpperCase() + selectedAlert.type.slice(1)}
                    </span>
                    {selectedAlert.resolved && (
                      <span className="badge resolved-badge">
                        <CheckCircle2 size={12} />
                        Resolved
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="modal-body">
                <div className="detail-section">
                  <label>Message</label>
                  <p className="detail-message">{selectedAlert.message}</p>
                </div>

                <div className="detail-grid">
                  <div className="detail-section">
                    <label>Device</label>
                    <p>{selectedAlert.device}</p>
                  </div>

                  <div className="detail-section">
                    <label>Device ID</label>
                    <p className="device-id">{selectedAlert.deviceId}</p>
                  </div>

                  <div className="detail-section">
                    <label>Time</label>
                    <p>{selectedAlert.timestamp.toLocaleString()}</p>
                  </div>

                  <div className="detail-section">
                    <label>Status</label>
                    <p>
                      {selectedAlert.resolved ? (
                        <span className="status-resolved">
                          <CheckCircle2 size={14} />
                          Resolved
                        </span>
                      ) : (
                        <span className="status-active">
                          <AlertCircle size={14} />
                          Active
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                {!selectedAlert.resolved && (
                  <button
                    className="btn btn-resolve"
                    onClick={() => markAsResolved(selectedAlert.id)}
                  >
                    <CheckCircle2 size={18} />
                    Mark as Resolved
                  </button>
                )}
                <button
                  className="btn btn-view-device"
                  onClick={() => navigate(`/admin/devices`)}
                >
                  View Device
                </button>
                <button className="btn btn-secondary" onClick={closeModal}>
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      </main>
    </div>
  );
}
