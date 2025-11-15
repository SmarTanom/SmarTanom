import React, { useMemo, useState, useEffect } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { ChevronLeft, ChevronRight } from 'lucide-react';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const PRIMARY_GREEN = 'rgba(51, 148, 50, 0.9)';

/**
 * PHLineChart Component (Now Bar Chart)
 * Displays pH sensor data as a bar chart with date navigation
 * 
 * @param {Array} phData - Array of pH sensor readings with {value, created_at} structure
 * @param {Object} plant - Plant object with ph_min and ph_max for optimal range indicators
 * @param {Number} barsPerPage - Number of bars to show per page (default: 10)
 * @param {String} timeRange - Time range selection: 'days', 'weeks', or 'months'
 */
const PHLineChart = ({ phData = [], plant = null, barsPerPage = 10, timeRange = 'days' }) => {
  const [currentPage, setCurrentPage] = useState(0);
  // Reset to latest page when input changes (e.g., switching Days/Weeks/Months)
  useEffect(() => {
    setCurrentPage(0);
  }, [timeRange, barsPerPage, phData]);
  // Helper function to get week key (ISO week)
  const getWeekKey = (date) => {
    const d = new Date(date);
    const dayOfWeek = d.getDay();
    const diff = d.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Adjust for Monday start
    const monday = new Date(d.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    return monday.toISOString().split('T')[0]; // YYYY-MM-DD format for Monday of the week
  };

  // Helper function to get month key
  const getMonthKey = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`; // YYYY-MM format
  };

  // Process and sort pH data - aggregate by day/week/month based on timeRange
  const processedData = useMemo(() => {
    if (!Array.isArray(phData) || phData.length === 0) {
      console.log('[PHLineChart] No pH data provided');
      return { labels: [], values: [], hasData: false, timestamps: [], allData: [] };
    }

    console.log(`[PHLineChart] Processing ${phData.length} pH readings for ${timeRange} view`);

    // Filter valid data
    const validData = phData
      .filter(d => d && d.created_at && typeof d.value !== 'undefined' && d.value !== null)
      .map(d => ({
        timestamp: new Date(d.created_at),
        value: Number(d.value)
      }))
      .filter(d => !isNaN(d.timestamp.getTime()) && Number.isFinite(d.value))
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()); // Newest first

    console.log(`[PHLineChart] Valid readings: ${validData.length}`);
    
    if (validData.length === 0) {
      return { labels: [], values: [], hasData: false, timestamps: [], allData: [] };
    }

    // Log date range of data
    const oldestDate = validData[validData.length - 1].timestamp;
    const newestDate = validData[0].timestamp;
    console.log(`[PHLineChart] Data range: ${oldestDate.toLocaleDateString()} to ${newestDate.toLocaleDateString()}`);

    // Group data based on timeRange
    const aggregatedData = new Map();
    
    validData.forEach(reading => {
      let key;
      
      switch (timeRange) {
        case 'weeks':
          key = getWeekKey(reading.timestamp);
          break;
        case 'months':
          key = getMonthKey(reading.timestamp);
          break;
        case 'days':
        default:
          key = reading.timestamp.toDateString(); // e.g., "Fri Nov 15 2025"
          break;
      }
      
      // Since data is sorted newest first, the first occurrence for each period is the latest reading
      if (!aggregatedData.has(key)) {
        aggregatedData.set(key, reading);
      }
    });

    const aggregationLabel = timeRange === 'weeks' ? 'weeks' : timeRange === 'months' ? 'months' : 'days';
    console.log(`[PHLineChart] Aggregated to ${aggregatedData.size} unique ${aggregationLabel}`);
    
    // Log first 10 keys for debugging
    const dataKeys = Array.from(aggregatedData.keys()).slice(0, 10);
    console.log(`[PHLineChart] First 10 aggregated ${aggregationLabel}:`, dataKeys);

    // Convert map to array and sort by date (newest first)
    const aggregatedArray = Array.from(aggregatedData.values())
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    return { 
      hasData: true, 
      allData: aggregatedArray
    };
  }, [phData, timeRange]);

  // Paginate data
  const paginatedData = useMemo(() => {
    if (!processedData.hasData) {
      return { labels: [], values: [], timestamps: [], totalPages: 0, startDate: null, endDate: null };
    }

    const { allData } = processedData;
    const totalPages = Math.ceil(allData.length / barsPerPage);
    const startIndex = currentPage * barsPerPage;
    const endIndex = Math.min(startIndex + barsPerPage, allData.length);
    const pageData = allData.slice(startIndex, endIndex);

    // Reverse for display (oldest to newest left to right)
    const displayData = [...pageData].reverse();

    const labels = displayData.map(d => {
      const date = d.timestamp;
      
      switch (timeRange) {
        case 'weeks': {
          // Show week range: "Nov 11-17"
          const weekEnd = new Date(date);
          weekEnd.setDate(date.getDate() + 6);
          const startMonth = date.toLocaleDateString('en-US', { month: 'short' });
          const endMonth = weekEnd.toLocaleDateString('en-US', { month: 'short' });
          const startDay = date.getDate();
          const endDay = weekEnd.getDate();
          
          if (startMonth === endMonth) {
            return `${startMonth} ${startDay}-${endDay}`;
          }
          return `${startMonth} ${startDay}-${endMonth} ${endDay}`;
        }
        case 'months': {
          // Show month and year: "Nov 2025"
          return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        }
        case 'days':
        default: {
          // Show month and day: "Nov 15"
          const month = date.toLocaleDateString('en-US', { month: 'short' });
          const day = date.getDate();
          return `${month} ${day}`;
        }
      }
    });

    const values = displayData.map(d => d.value);
    const timestamps = displayData.map(d => d.timestamp);

    // Date range for display
    const startDate = pageData[pageData.length - 1]?.timestamp;
    const endDate = pageData[0]?.timestamp;

    return { labels, values, timestamps, totalPages, startDate, endDate };
  }, [processedData, currentPage, barsPerPage]);

  const { labels, values, timestamps, totalPages, startDate, endDate } = paginatedData;

  // Chart configuration for bars
  const chartData = useMemo(() => {
    // Create gradient for bars
    const createGradient = (ctx) => {
      const gradient = ctx.createLinearGradient(0, 0, 0, 400);
      gradient.addColorStop(0, 'rgba(51, 148, 50, 1)');
      gradient.addColorStop(0.5, 'rgba(51, 148, 50, 0.85)');
      gradient.addColorStop(1, 'rgba(51, 148, 50, 0.7)');
      return gradient;
    };

    return {
      labels,
      datasets: [
        {
          label: 'pH Level',
          data: values,
          backgroundColor: function(context) {
            const ctx = context.chart.ctx;
            return createGradient(ctx);
          },
          borderColor: 'rgba(51, 148, 50, 1)',
          borderWidth: 0,
          borderRadius: 4,
          borderSkipped: false,
        }
      ]
    };
  }, [labels, values]);

  const chartOptions = useMemo(() => {
    // Calculate y-axis range
    let minY = 0;
    let maxY = 14;
    
    if (values.length > 0) {
      const dataMin = Math.min(...values);
      const dataMax = Math.max(...values);
      const padding = 0.3;
      minY = Math.max(0, Math.floor((dataMin - padding) * 10) / 10);
      maxY = Math.min(14, Math.ceil((dataMax + padding) * 10) / 10);
    }

    // Add plant optimal range if available
    if (plant?.ph_min !== undefined && plant?.ph_max !== undefined) {
      const phMin = Number(plant.ph_min);
      const phMax = Number(plant.ph_max);
      
      if (Number.isFinite(phMin) && Number.isFinite(phMax)) {
        minY = Math.min(minY, Math.floor((phMin - 0.3) * 10) / 10);
        maxY = Math.max(maxY, Math.ceil((phMax + 0.3) * 10) / 10);
      }
    }

    return {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false,
      },
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          enabled: true,
          backgroundColor: 'rgba(255, 255, 255, 0.98)',
          titleColor: '#333',
          bodyColor: '#666',
          borderColor: PRIMARY_GREEN,
          borderWidth: 2,
          padding: 16,
          displayColors: false,
          bodyFont: {
            size: 13,
            weight: '500'
          },
          titleFont: {
            size: 14,
            weight: '600'
          },
          callbacks: {
            title: function(context) {
              const index = context[0].dataIndex;
              if (timestamps && timestamps[index]) {
                const date = timestamps[index];
                const dateStr = date.toLocaleDateString('en-US', { 
                  month: 'short', 
                  day: 'numeric', 
                  year: 'numeric'
                });
                const timeStr = date.toLocaleTimeString('en-US', { 
                  hour: '2-digit', 
                  minute: '2-digit',
                  hour12: true 
                });
                return [`${dateStr}`, `Last reading: ${timeStr}`];
              }
              return context[0].label;
            },
            label: function(context) {
              const value = context.parsed.y;
              const phValue = value.toFixed(2);
              
              let status = '';
              let statusEmoji = '';
              
              if (plant?.ph_min !== undefined && plant?.ph_max !== undefined) {
                const phMin = Number(plant.ph_min);
                const phMax = Number(plant.ph_max);
                
                if (value < phMin) {
                  statusEmoji = '⚠️';
                  status = ' - Too Low';
                } else if (value > phMax) {
                  statusEmoji = '⚠️';
                  status = ' - Too High';
                } else {
                  statusEmoji = '✅';
                  status = ' - Optimal';
                }
              } else {
                statusEmoji = 'ℹ️';
              }
              
              return `${statusEmoji} pH: ${phValue}${status}`;
            }
          }
        }
      },
      scales: {
        x: {
          display: true,
          grid: {
            display: false,
            drawBorder: false,
          },
          ticks: {
            color: '#a0aec0',
            font: {
              size: 11,
              weight: '500'
            },
          },
          border: {
            display: false
          }
        },
        y: {
          display: true,
          min: minY,
          max: maxY,
          grid: {
            display: true,
            color: 'rgba(139, 167, 151, 0.12)',
            drawBorder: false,
          },
          ticks: {
            color: '#8BA797',
            font: {
              size: 11,
              weight: '500'
            },
            callback: function(value) {
              return value.toFixed(1) + ' pH';
            },
            stepSize: 0.1,
          },
          border: {
            display: false
          }
        }
      }
    };
  }, [values, timestamps, plant]);

  // Navigation handlers
  const canGoPrev = currentPage < totalPages - 1;
  const canGoNext = currentPage > 0;

  const handlePrev = () => {
    if (canGoPrev) {
      setCurrentPage(prev => prev + 1);
    }
  };

  const handleNext = () => {
    if (canGoNext) {
      setCurrentPage(prev => prev - 1);
    }
  };

  const handleLatest = () => {
    setCurrentPage(0);
  };

  // Format date range for display
  const dateRangeText = useMemo(() => {
    if (!startDate || !endDate) return '';
    
    switch (timeRange) {
      case 'weeks': {
        const startWeekEnd = new Date(startDate);
        startWeekEnd.setDate(startDate.getDate() + 6);
        const endWeekEnd = new Date(endDate);
        endWeekEnd.setDate(endDate.getDate() + 6);
        
        const start = startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const end = endWeekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        
        return `${start} - ${end}`;
      }
      case 'months': {
        const start = startDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        const end = endDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        
        if (start === end) return start;
        return `${start} - ${end}`;
      }
      case 'days':
      default: {
        const start = startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const end = endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        
        if (start === end) return start;
        return `${start} - ${end}`;
      }
    }
  }, [startDate, endDate, timeRange]);

  // Get display unit label
  const getUnitLabel = () => {
    switch (timeRange) {
      case 'weeks': return 'Weeks';
      case 'months': return 'Months';
      case 'days':
      default: return 'Days';
    }
  };

  // Handle no data state
  if (!processedData.hasData) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        minHeight: '200px',
        color: '#999',
        fontSize: '14px',
        fontWeight: '500',
        padding: '20px'
      }}>
        <div style={{ 
          fontSize: '48px', 
          marginBottom: '12px',
          opacity: 0.5
        }}>
          📊
        </div>
        <div style={{ fontSize: '15px', fontWeight: '600', color: '#666', marginBottom: '6px' }}>
          {phData.length === 0 ? 'No pH Data Available' : 'Processing pH Data...'}
        </div>
        <div style={{ fontSize: '12px', color: '#999', textAlign: 'center', maxWidth: '300px' }}>
          {phData.length === 0 
            ? 'pH sensor readings will appear here once your device starts collecting data.' 
            : 'Loading sensor readings...'}
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', height: '100%', minHeight: '200px', width: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Date Range Navigation */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '12px',
        padding: '0 4px'
      }}>
        <button
          onClick={handlePrev}
          disabled={!canGoPrev}
          style={{
            background: canGoPrev ? 'rgba(51, 148, 50, 0.1)' : 'rgba(200, 200, 200, 0.1)',
            border: canGoPrev ? '1.5px solid rgba(51, 148, 50, 0.3)' : '1.5px solid #ddd',
            borderRadius: '8px',
            padding: '8px 12px',
            cursor: canGoPrev ? 'pointer' : 'not-allowed',
            opacity: canGoPrev ? 1 : 0.4,
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            transition: 'all 0.2s ease',
            fontSize: '12px',
            fontWeight: '600',
            color: canGoPrev ? PRIMARY_GREEN.replace('0.9', '1') : '#999'
          }}
          onMouseEnter={(e) => {
            if (canGoPrev) {
              e.currentTarget.style.background = 'rgba(51, 148, 50, 0.15)';
              e.currentTarget.style.transform = 'translateX(-2px)';
            }
          }}
          onMouseLeave={(e) => {
            if (canGoPrev) {
              e.currentTarget.style.background = 'rgba(51, 148, 50, 0.1)';
              e.currentTarget.style.transform = 'translateX(0)';
            }
          }}
        >
          <ChevronLeft size={16} />
          <span>Older</span>
        </button>

        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '2px'
        }}>
          <span style={{ 
            fontSize: '13px', 
            fontWeight: '700', 
            color: '#4a5568' 
          }}>
            {dateRangeText}
          </span>
          <span style={{ 
            fontSize: '10px', 
            color: '#a0aec0',
            fontWeight: '500'
          }}>
            Last {barsPerPage} {getUnitLabel()}
          </span>
        </div>

        <button
          onClick={handleNext}
          disabled={!canGoNext}
          style={{
            background: canGoNext ? 'rgba(51, 148, 50, 0.1)' : 'rgba(200, 200, 200, 0.1)',
            border: canGoNext ? '1.5px solid rgba(51, 148, 50, 0.3)' : '1.5px solid #ddd',
            borderRadius: '8px',
            padding: '8px 12px',
            cursor: canGoNext ? 'pointer' : 'not-allowed',
            opacity: canGoNext ? 1 : 0.4,
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            transition: 'all 0.2s ease',
            fontSize: '12px',
            fontWeight: '600',
            color: canGoNext ? PRIMARY_GREEN.replace('0.9', '1') : '#999'
          }}
          onMouseEnter={(e) => {
            if (canGoNext) {
              e.currentTarget.style.background = 'rgba(51, 148, 50, 0.15)';
              e.currentTarget.style.transform = 'translateX(2px)';
            }
          }}
          onMouseLeave={(e) => {
            if (canGoNext) {
              e.currentTarget.style.background = 'rgba(51, 148, 50, 0.1)';
              e.currentTarget.style.transform = 'translateX(0)';
            }
          }}
        >
          <span>Newer</span>
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Chart Container */}
      <div style={{ flex: 1, position: 'relative', minHeight: '180px' }}>
        <Bar data={chartData} options={chartOptions} />
      </div>

      {/* Jump to Latest Button */}
      {currentPage > 0 && (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          marginTop: '8px'
        }}>
          <button
            onClick={handleLatest}
            style={{
              background: PRIMARY_GREEN,
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '6px 16px',
              fontSize: '11px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: '0 2px 4px rgba(51, 148, 50, 0.3)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(51, 148, 50, 1)';
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 4px 8px rgba(51, 148, 50, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = PRIMARY_GREEN;
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 2px 4px rgba(51, 148, 50, 0.3)';
            }}
          >
            📍 Jump to Latest
          </button>
        </div>
      )}
    </div>
  );
};

export default PHLineChart;
