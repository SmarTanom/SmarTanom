# ESP32 WiFi Provisioning — Deployment Checklist

## 🚀 Pre-Deployment Checklist

### Backend Configuration

- [ ] **Environment Variables Set**
  - [ ] `DEVICE_PROVISION_API_KEY` set to secure random string (not dev default)
  - [ ] `AUTO_CREATE_DEVICE_ON_FIRST_CONNECT` configured (true/false based on security policy)
  - [ ] `DEVICE_PROVISION_THROTTLE_RATE` reviewed (default: 10/hour)
  - [ ] `DEBUG=false` in production
  - [ ] `SECRET_KEY` set to secure random string

- [ ] **Database**
  - [ ] Migrations applied: `python manage.py migrate`
  - [ ] `wifi_configured` field exists on Device model (already migrated)
  - [ ] Database indexes verified

- [ ] **API Endpoints Verified**
  - [ ] POST `/api/devices/provision/` returns 200 for valid requests
  - [ ] GET `/api/devices/{serial}/config/` returns device configuration
  - [ ] Authentication required in production (test with invalid/missing header)
  - [ ] Rate limiting active (test exceeding limit)

- [ ] **Tests Passing**
  - [ ] Run: `python manage.py test apps.devices.tests.DeviceProvisioningTests`
  - [ ] All 11 tests passing
  - [ ] No regressions in existing tests

### ESP32 Firmware

- [ ] **Configuration Set**
  - [ ] `DEVICE_SERIAL` unique per device (format: `SMRT-XXX-XXX`)
  - [ ] `BACKEND_URL` pointing to production server
  - [ ] `DEVICE_API_KEY` matches backend (or empty for dev)
  - [ ] `FIRMWARE_VERSION` documented

- [ ] **Libraries Installed**
  - [ ] ArduinoJson library installed via Library Manager
  - [ ] All built-in libraries available (WiFi, WebServer, etc.)

- [ ] **Firmware Tested**
  - [ ] Device successfully broadcasts AP
  - [ ] Web portal accessible at 192.168.4.1
  - [ ] WiFi networks listed and selectable
  - [ ] Connection successful with correct password
  - [ ] Retry works with incorrect password
  - [ ] Backend receives provision POST
  - [ ] Serial monitor logs show no errors

### Production Deployment

- [ ] **Backend Deployment**
  - [ ] Code deployed to Render/production server
  - [ ] Environment variables configured in production
  - [ ] HTTPS enabled
  - [ ] CORS configured for frontend domains
  - [ ] Health check passing

- [ ] **Monitoring & Logging**
  - [ ] Provisioning attempts visible in logs
  - [ ] Failed attempts monitored
  - [ ] WebSocket broadcasts working
  - [ ] Error tracking configured

- [ ] **Security Hardening**
  - [ ] `DEBUG=false` verified
  - [ ] Strong `DEVICE_PROVISION_API_KEY` generated
  - [ ] Rate limiting verified in production
  - [ ] TLS certificates valid
  - [ ] ⚠️ **CRITICAL**: Replace `setInsecure()` in firmware with proper cert validation

### Documentation

- [ ] **Developer Documentation**
  - [x] WIFI_PROVISIONING_README.md reviewed
  - [x] PR_DESCRIPTION.md reviewed
  - [x] IMPLEMENTATION_SUMMARY.md reviewed
  - [ ] Internal team briefed on new feature

- [ ] **User Documentation**
  - [ ] User guide for device setup created
  - [ ] Troubleshooting guide published
  - [ ] Support team trained

## 🧪 Post-Deployment Verification

### Smoke Tests

- [ ] **Device Provisioning Flow**
  1. [ ] Flash new device with unique serial
  2. [ ] Power on and verify AP broadcast
  3. [ ] Connect to device AP from phone
  4. [ ] Access web portal
  5. [ ] Select WiFi and enter password
  6. [ ] Device connects successfully
  7. [ ] Backend shows `wifi_configured=true`
  8. [ ] Dashboard displays device

- [ ] **API Endpoints**
  - [ ] POST `/api/devices/provision/` accepts valid requests
  - [ ] Rejects invalid serial formats
  - [ ] Rejects requests without auth in production
  - [ ] Rate limiting blocks excessive requests
  - [ ] GET `/api/devices/{serial}/config/` returns correct data

- [ ] **Error Handling**
  - [ ] Wrong WiFi password shows retry option
  - [ ] Non-existent device handled correctly
  - [ ] Network timeout handled gracefully
  - [ ] Backend unavailable handled (device retries)

### Performance Tests

- [ ] **Load Testing**
  - [ ] Multiple devices provisioning simultaneously
  - [ ] Rate limiting doesn't affect legitimate use
  - [ ] Database performance acceptable
  - [ ] WebSocket broadcasts don't cause lag

- [ ] **Network Tests**
  - [ ] Device provisions over 2.4GHz WiFi
  - [ ] Device provisions over 5GHz WiFi (if supported)
  - [ ] Long SSID names handled
  - [ ] Special characters in SSID handled
  - [ ] Long WiFi passwords handled

## 🔧 Maintenance Tasks

### Ongoing Monitoring

- [ ] **Weekly Review**
  - [ ] Check provisioning success rate
  - [ ] Review failed provision attempts
  - [ ] Monitor rate limiting triggers
  - [ ] Check for unusual activity

- [ ] **Monthly Tasks**
  - [ ] Review logs for security issues
  - [ ] Update firmware if needed
  - [ ] Rotate `DEVICE_PROVISION_API_KEY` if policy requires
  - [ ] Update documentation

### Incident Response

- [ ] **If Provisioning Failures Spike**
  1. [ ] Check backend server status
  2. [ ] Verify environment variables unchanged
  3. [ ] Check rate limiting configuration
  4. [ ] Review recent code deployments
  5. [ ] Check for network issues
  6. [ ] Review device logs if accessible

- [ ] **If Security Incident Detected**
  1. [ ] Rotate `DEVICE_PROVISION_API_KEY` immediately
  2. [ ] Review access logs
  3. [ ] Block suspicious IPs
  4. [ ] Investigate unauthorized provision attempts
  5. [ ] Update security policies

## 📋 Manufacturing Checklist (Per Device)

- [ ] **Pre-Flash**
  - [ ] Generate unique serial: `SMRT-XXX-XXX`
  - [ ] Record serial in manufacturing database
  - [ ] Update `DEVICE_SERIAL` in firmware
  - [ ] (Optional) Generate unique `DEVICE_API_KEY` per device

- [ ] **Flash & Test**
  - [ ] Flash firmware to ESP32
  - [ ] Verify AP broadcasts with correct serial
  - [ ] Test provision flow end-to-end
  - [ ] Verify backend communication
  - [ ] Factory reset and retest

- [ ] **Quality Control**
  - [ ] AP signal strength adequate
  - [ ] Web portal loads quickly
  - [ ] All WiFi networks detected
  - [ ] Connection stable
  - [ ] No errors in serial output

- [ ] **Packaging**
  - [ ] Print serial on device label
  - [ ] Include AP password (`smartanom123`) in manual
  - [ ] Include QR code for setup guide (if available)
  - [ ] Package with user documentation

## ⚠️ Critical Production Issues

### Known Limitations

- ⚠️ **TLS Security**: Firmware uses `setInsecure()` for HTTPS
  - **Impact**: Vulnerable to MITM attacks
  - **Mitigation**: Replace with proper certificate validation
  - **Priority**: HIGH

- ⚠️ **Hardcoded AP Password**: All devices use `smartanom123`
  - **Impact**: Anyone can access device AP
  - **Mitigation**: Randomize per-device or use WPS
  - **Priority**: MEDIUM

- ⚠️ **No Firmware Update Mechanism**: OTA not implemented
  - **Impact**: Cannot remotely update firmware
  - **Mitigation**: Plan for manual update process
  - **Priority**: MEDIUM

### Rollback Plan

If provisioning system causes issues:

1. [ ] **Immediate Actions**
   - [ ] Set `AUTO_CREATE_DEVICE_ON_FIRST_CONNECT=false`
   - [ ] Increase rate limiting if under attack
   - [ ] Revert to previous code version if needed

2. [ ] **Communication**
   - [ ] Notify users of provisioning issues
   - [ ] Provide manual setup instructions
   - [ ] Update status page

3. [ ] **Investigation**
   - [ ] Collect error logs
   - [ ] Review recent changes
   - [ ] Test in staging environment
   - [ ] Fix and redeploy

## ✅ Sign-Off

- [ ] **Backend Developer**: Reviewed and approved
- [ ] **Firmware Developer**: Reviewed and approved
- [ ] **DevOps Engineer**: Deployment verified
- [ ] **QA Team**: Tests passed
- [ ] **Product Owner**: Feature accepted
- [ ] **Security Team**: Security review completed

---

**Deployment Date**: _______________
**Deployed By**: _______________
**Version**: 1.0.0
**Status**: ⏳ Pending / ✅ Complete
