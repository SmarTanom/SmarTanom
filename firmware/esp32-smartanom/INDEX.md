# SmarTanom ESP32 Firmware - Documentation Index

Welcome to the SmarTanom ESP32 firmware documentation! This index will help you find the information you need.

---

## 📚 Documentation Files

### 1. **[README.md](README.md)** - Complete Reference Guide
**Best for:** Developers, System Integrators, Technical Users

**Contains:**
- ✅ Full feature list and capabilities
- 🔧 Hardware requirements and pin configurations
- 📦 Installation and library setup
- ⚙️ Configuration before flashing
- 📡 WiFi provisioning process
- 🎯 Sensor calibration procedures
- 💻 Code snippets for each sensor
- 🐛 Troubleshooting common issues
- 🏗️ System architecture overview
- 📊 Advanced features (exponential backoff, NTP sync)

**Read this if you want to:**
- Understand the complete system
- Set up the hardware from scratch
- Calibrate sensors for accuracy
- Troubleshoot problems
- Understand the code in depth

---

### 2. **[QUICK_START.md](QUICK_START.md)** - 5-Minute Setup Guide
**Best for:** Beginners, Quick Deployment, First-Time Users

**Contains:**
- 🚀 Step-by-step installation (Arduino IDE + ESP32)
- 📝 Required library installation
- ⚡ Fast configuration checklist
- 📤 Upload instructions
- 📱 WiFi provisioning walkthrough
- ✅ Verification steps
- 🆘 Quick troubleshooting

**Read this if you want to:**
- Get started quickly
- Follow a simple, linear process
- Skip technical details for now
- Just get it working

---

### 3. **[METHODOLOGY.md](METHODOLOGY.md)** - Academic Research Documentation
**Best for:** Researchers, Thesis Writers, Academic Publications

**Contains:**
- 📖 Formal academic writing style
- 🔬 Detailed sensor methodology for each component:
  - pH Sensor (median filtering)
  - TDS/EC Sensor (temperature compensation)
  - DS18B20 Temperature Sensor (OneWire protocol)
  - Turbidity Sensor (nephelometry)
  - Water Level Sensor (state machine with hysteresis)
  - ESP32 Main Controller (system integration)
- 📊 Code explanations with technical depth
- 🎯 Purpose and significance of each measurement
- 🔄 Complete data flow from sensor to dashboard
- ✔️ Validation against laboratory instruments

**Read this if you want to:**
- Write a thesis or research paper
- Understand the scientific principles
- Cite methodologies in publications
- Present technical details formally

---

### 4. **[ARCHITECTURE.md](ARCHITECTURE.md)** - Visual System Diagrams
**Best for:** Visual Learners, System Designers, Presentations

**Contains:**
- 🔌 Complete wiring diagrams
- 📐 Pin assignment tables
- 🔄 Software state machine diagrams
- 📊 Data flow architecture
- 🌐 Network communication flows
- ⏱️ Timing diagrams for sensor polling
- 🧠 Memory layout visualization
- ⚡ Power consumption profiles
- 📡 WebSocket communication sequence

**Read this if you want to:**
- See visual representations
- Understand system interactions
- Create presentations or posters
- Design similar systems
- Understand timing and sequencing

---

## 🎯 Quick Navigation by Task

### "I want to build the hardware"
1. Start with [README.md](README.md) → **Pin Configuration** section
2. Check [ARCHITECTURE.md](ARCHITECTURE.md) → **Hardware Architecture** diagrams
3. Verify wiring with the visual diagrams

### "I want to upload the firmware"
1. Start with [QUICK_START.md](QUICK_START.md) → Follow steps 1-4
2. If issues occur, check [README.md](README.md) → **Troubleshooting** section

### "I want to understand how it works"
1. Start with [README.md](README.md) → **Architecture** section
2. Deep dive: [METHODOLOGY.md](METHODOLOGY.md) → Read each sensor section
3. Visualize: [ARCHITECTURE.md](ARCHITECTURE.md) → Review all diagrams

### "I want to write a thesis chapter"
1. Use [METHODOLOGY.md](METHODOLOGY.md) as your template
2. Copy code snippets and explanations
3. Reference [ARCHITECTURE.md](ARCHITECTURE.md) for figures
4. Cite technical details from [README.md](README.md)

### "I want to calibrate sensors"
1. Read [README.md](README.md) → **Sensor Calibration** section
2. Follow step-by-step procedures for each sensor
3. Reference [METHODOLOGY.md](METHODOLOGY.md) for theory

### "I want to troubleshoot a problem"
1. Check [QUICK_START.md](QUICK_START.md) → **Common Issues** section
2. Detailed troubleshooting: [README.md](README.md) → **Troubleshooting** section
3. Check Serial Monitor output examples

---

## 📖 Documentation Structure Comparison

| Feature | README | QUICK_START | METHODOLOGY | ARCHITECTURE |
|---------|--------|-------------|-------------|--------------|
| **Length** | Long | Short | Very Long | Medium |
| **Style** | Technical | Casual | Academic | Visual |
| **Detail Level** | High | Low | Very High | Medium |
| **Code Snippets** | ✅ Many | ❌ Few | ✅ Detailed | ❌ None |
| **Diagrams** | ❌ Few | ❌ None | ❌ None | ✅ Many |
| **For Beginners** | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐ | ⭐⭐ |
| **For Researchers** | ⭐⭐⭐ | ⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **For Developers** | ⭐⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ |

---

## 🎓 Learning Path Recommendations

### Path 1: Beginner to Expert
```
1. QUICK_START.md (5 min) → Get it working
2. README.md - Features & Configuration (15 min) → Understand basics
3. README.md - Code Snippets (30 min) → Learn implementation
4. METHODOLOGY.md (1 hour) → Deep understanding
5. ARCHITECTURE.md (30 min) → System-level view
```

### Path 2: Academic Research Focus
```
1. QUICK_START.md (5 min) → Setup hardware
2. METHODOLOGY.md (1-2 hours) → Read thoroughly
3. ARCHITECTURE.md (30 min) → Understand system design
4. README.md - Calibration (30 min) → Ensure accuracy
```

### Path 3: Development & Integration
```
1. README.md - Overview (10 min) → Understand capabilities
2. ARCHITECTURE.md (45 min) → Study all diagrams
3. README.md - Code Snippets (1 hour) → Implement features
4. README.md - Troubleshooting (15 min) → Handle issues
```

---

## 🔑 Key Concepts by Document

### README.md Key Topics
- Pin assignments (GPIO 34, 35, 32, 33, 4)
- ADC configuration (12-bit, 0-3.3V range)
- WebSocket communication
- Exponential backoff reconnection
- Sensor calibration formulas
- JSON payload structure

### QUICK_START.md Key Topics
- Arduino IDE setup
- Library installation
- Device serial number configuration
- Upload process
- WiFi provisioning steps
- First-time verification

### METHODOLOGY.md Key Topics
- Median filtering for pH (remove outliers)
- Temperature compensation for EC/TDS (2%/°C)
- OneWire protocol for DS18B20
- Nephelometry for turbidity measurement
- State machine with hysteresis for water level
- ESP32 dual-mode operation (provisioning vs. normal)

### ARCHITECTURE.md Key Topics
- Complete wiring diagram
- State machine visualization
- Data pipeline (sensors → ESP32 → backend → dashboard)
- WebSocket handshake sequence
- Memory layout (Flash, SRAM, EEPROM)
- Timing diagrams (5-second polling cycle)

---

## 💡 Pro Tips

### For Quick Reference
**Create bookmarks to these sections:**
- README.md → Pin Configuration table
- README.md → Troubleshooting section
- METHODOLOGY.md → Your specific sensor section
- ARCHITECTURE.md → Wiring diagram

### For Thesis Writing
**Copy-paste ready sections:**
- METHODOLOGY.md → All sensor sections (3.3.1 - 3.3.6)
- METHODOLOGY.md → Data flow diagram (Section 3.4)
- ARCHITECTURE.md → Diagrams (with proper citation)

### For Development
**Keep these open while coding:**
- README.md → Code Snippets section
- ARCHITECTURE.md → State machine diagram
- Your IDE with esp32-smartanom-clean.ino

---

## 📞 Support & Additional Resources

### Documentation Feedback
Found an error or need clarification?
- Open an issue: [GitHub Issues](https://github.com/SmarTanom/SmarTanom/issues)
- Email: support@smartanom.com

### Related Documentation
- **Backend API:** See `backend/README.md` in the main repository
- **Frontend Dashboard:** See `frontend/README.md` in the main repository
- **Hardware Assembly Guide:** Check the project wiki

### External References
- **ESP32 Documentation:** https://docs.espressif.com/
- **Arduino Core for ESP32:** https://github.com/espressif/arduino-esp32
- **ArduinoJson Guide:** https://arduinojson.org/
- **OneWire Library:** https://www.pjrc.com/teensy/td_libs_OneWire.html

---

## 🎯 Success Checklist

Before you finish setup, make sure you can answer "Yes" to these:

- [ ] I understand which document to read for my goal
- [ ] I have all required hardware components
- [ ] Arduino IDE and ESP32 support are installed
- [ ] Required libraries are installed
- [ ] Device serial number is configured in firmware
- [ ] Backend URL is correct
- [ ] Firmware uploaded successfully
- [ ] WiFi provisioning completed
- [ ] Serial Monitor shows sensor readings
- [ ] Dashboard displays device data
- [ ] I know where to look for troubleshooting help

---

## 📄 Document Version History

| Version | Date | Changes |
|---------|------|---------|
| 2.0.0 | 2025-11-24 | Complete documentation overhaul |
| | | - Created comprehensive README |
| | | - Added QUICK_START guide |
| | | - Added METHODOLOGY chapter |
| | | - Added ARCHITECTURE diagrams |
| | | - Cleaned firmware to 1200 lines |
| 1.2.0 | 2024-XX-XX | Previous version (2441 lines) |

---

## 🌟 Quick Start Summary

**For the absolute fastest path to a working system:**

1. **Download** `esp32-smartanom-clean.ino`
2. **Install** Arduino IDE + ESP32 + 4 libraries (see QUICK_START.md Step 1-2)
3. **Edit** line with `#define DEVICE_SERIAL` (your unique ID)
4. **Upload** to ESP32 (Tools → Board → ESP32 Dev Module)
5. **Connect** to ESP32 WiFi on your phone (SSID = device serial)
6. **Configure** WiFi via captive portal (http://192.168.4.1)
7. **Verify** Serial Monitor shows readings (115200 baud)
8. **Done!** Check dashboard for live data

**Total time: ~15 minutes** (if you have hardware ready)

---

## 🎨 Documentation Philosophy

These documents were designed with different audiences in mind:

- **README.md** = The "Encyclopedia" - Everything you could possibly need
- **QUICK_START.md** = The "Tutorial" - Hand-holding for beginners
- **METHODOLOGY.md** = The "Textbook" - Academic rigor and theory
- **ARCHITECTURE.md** = The "Blueprint" - Visual system design

**Choose the document that matches your learning style and goals!**

---

**Ready to get started? Pick your path above and dive in! 🚀**

---

*Documentation maintained by the SmarTanom Team*  
*Last updated: November 24, 2025*  
*Firmware version: 2.0.0*
