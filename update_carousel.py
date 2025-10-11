import re

# Read the file
with open(r'frontend\src\pages\Dashboard.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Pattern to match the Dashboard function logic
old_logic = r'''export default function Dashboard\(\) \{
  const carouselRef = useRef\(null\);
  const \[activeIdx, setActiveIdx\] = useState\(0\);

  // Roughly compute active card based on scroll position
  useEffect\(\(\) => \{
    const el = carouselRef\.current;
    if \(!el\) return;
    const onScroll = \(\) => \{
      const w = el\.clientWidth; // viewport width of carousel
      const cardW = w \* 0\.85; // matches flex-basis 85vw
      const gap = 16; // approximate gap from CSS
      const idx = Math\.round\(el\.scrollLeft / \(cardW \+ gap\)\);
      setActiveIdx\(Math\.max\(0, Math\.min\(devices\.length - 1, idx\)\)\);
    \};
    el\.addEventListener\('scroll', onScroll, \{ passive: true \}\);
    return \(\) => el\.removeEventListener\('scroll', onScroll\);
  \}, \[\]\);

  const currentDevice = devices\[activeIdx\];
  const data = currentDevice\.data;
  const currentPH = useMemo\(\(\) => data\.phHistory\[data\.phHistory\.length - 1\]\.toFixed\(1\), \[activeIdx\]\);'''

new_logic = '''export default function Dashboard() {
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
  const currentPH = useMemo(() => data.phHistory[data.phHistory.length - 1].toFixed(1), [activeIdx]);'''

# Replace the old logic with new logic
content = re.sub(old_logic, new_logic, content, flags=re.DOTALL)

# Also need to update the devices.map to infiniteDevices.map
content = content.replace(
    '{devices.map((d, i) => (',
    '{infiniteDevices.map((d, i) => ('
)

# Update the key to include index to avoid duplicate keys
content = content.replace(
    'key={d.id}',
    'key={`${d.id}-${i}`}'
)

# Write back
with open(r'frontend\src\pages\Dashboard.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Dashboard.jsx updated successfully with infinite carousel!")
