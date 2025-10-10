import React, { useEffect, useMemo, useRef, useState } from 'react';
import '../assets/styles/UserDashboard.css';
import {
  Leaf,
  Settings,
  ChevronRight,
  AlertCircle,
  Wifi,
  RefreshCw,
  Droplets,
  Activity,
  Zap,
  Waves,
  Droplet,
  Thermometer,
  Wind,
  Sun,
  User
} from 'lucide-react';
import { MdScience } from 'react-icons/md';

// Simple hash function to seed PRNG from device ID
const hashStringToSeed = (str) => {
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash);
};

// Seeded PRNG (mulberry32)
const mulberry32 = (seed) => {
  return function() {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

// Generate pH history with seeded randomness
const generatePHHistory = (rng) => {
  const points = [];
  const baseValues = [6.1, 6.15, 6.2, 6.25, 6.3, 6.35, 6.4, 6.5, 6.55, 6.6, 6.55, 6.5, 6.45, 6.4, 6.35, 6.3];
  for (let i = 0; i < 60; i++) {
    const baseIdx = i % baseValues.length;
    const noise = (rng() - 0.5) * 0.08;
    points.push(Math.min(6.6, Math.max(6.0, baseValues[baseIdx] + noise)));
  }
  return points;
};

// Generate per-device mock data
const generateDeviceData = (deviceId) => {
  const seed = hashStringToSeed(deviceId);
  const rng = mulberry32(seed);
  
  const connectivity = rng() > 0.2 ? 'Online' : 'Offline';
  const syncMinutes = Math.floor(rng() * 60) + 1;
  const lastSyncLabel = syncMinutes === 1 ? '1 minute ago' : ` minutes ago`;
  
  const alerts = [
    'EC too low (Inadequate nutrients)',
    'pH trending high - check solution',
    'Water level below threshold',
    'Temperature outside optimal range'
  ];
  const alertText = alerts[Math.floor(rng() * alerts.length)];
  
  const nutrients = ['Low (Nutrient needs refilling)', 'Optimal', 'High (Reduce concentration)'];
  const nutrientText = nutrients[Math.floor(rng() * nutrients.length)];
  
  return {
    alertText,
    connectivity,
    lastSyncLabel,
    nutrientText,
    phHistory: generatePHHistory(mulberry32(seed + 1000)),
    sensors: {
      ec: 0.8 + rng() * 2.0,
      tds: 400 + rng() * 800,
      waterLevel: 60 + rng() * 35,
      turbidity: 1.5 + rng() * 3.0
    },
    environment: {
      temperature: 20 + rng() * 8,
      humidity: 50 + rng() * 30,
      light: 5000 + rng() * 10000
    }
  };
};

// Initialize devices with per-device data
const initDevices = () => [
  { name: 'Porch SmarTanom', id: '0000000001', image: '/favicon.png', data: generateDeviceData('0000000001') },
  { name: 'Greenhouse A', id: 'GH-A-01', image: '/favicon.png', data: generateDeviceData('GH-A-01') },
  { name: 'Indoor Rack', id: 'RACK-02', image: '/favicon.png', data: generateDeviceData('RACK-02') },
];

const devices = initDevices();

function PHBar({ v, i }) {
  const min = 6.0;
  const max = 6.6;
  const clamped = Math.min(max, Math.max(min, v));
  const pct = ((clamped - min) / (max - min)) * 100;
  return (
    <div className="ph-bar-wrapper" aria-label={`pH ``}>
      <div className="ph-bar" style={{ height: `%`, animationDelay: `ms` }} />
    </div>
  );
}

export default function Dashboard() {
  const carouselRef = useRef(null);
  const [activeIdx, setActiveIdx] = useState(0);
  const scrollingRef = useRef(false);
  
  // Create infinite carousel by duplicating devices (clone before + real + clone after)
  const infiniteDevices = [...devices, ...devices, ...devices];
  const realStartIdx = devices.length; // Start at middle set (real devices)

  // Initialize scroll position to middle set
  useEffect(() => {
    const el = carouselRef.current;
    if (!el) return;
    const w = el.clientWidth;
    const cardW = w * 0.85;
    const gap = 16;
    // Scroll to first real device (middle set)
    el.scrollLeft = realStartIdx * (cardW + gap);
  }, []);

  // Handle infinite scroll looping
  useEffect(() => {
    const el = carouselRef.current;
    if (!el) return;
    
    const onScroll = () => {
      if (scrollingRef.current) return; // Prevent interference during programmatic scroll
      
      const w = el.clientWidth;
      const cardW = w * 0.85;
      const gap = 16;
      const scrollIdx = Math.round(el.scrollLeft / (cardW + gap));
      
      // Calculate real index (0-2 for 3 devices)
      const realIdx = scrollIdx % devices.length;
      setActiveIdx(realIdx);
      
      // If scrolled to first clone set (before real), jump to last clone set
      if (scrollIdx < devices.length) {
        scrollingRef.current = true;
        el.scrollLeft = (scrollIdx + devices.length * 2) * (cardW + gap);
        setTimeout(() => { scrollingRef.current = false; }, 50);
      }
      // If scrolled to last clone set (after real), jump to first clone set
      else if (scrollIdx >= devices.length * 2) {
        scrollingRef.current = true;
        el.scrollLeft = (scrollIdx - devices.length * 2) * (cardW + gap);
        setTimeout(() => { scrollingRef.current = false; }, 50);
      }
    };
    
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  const currentDevice = devices[activeIdx];
  const data = currentDevice.data;
  const currentPH = useMemo(() => data.phHistory[data.phHistory.length - 1].toFixed(1), [activeIdx]);

  return (
    <div className="dashboard-root">
