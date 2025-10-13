# Plant Photo Change Feature Documentation

## Overview
Added functionality for device owners to change/update plant photos directly from the Device Details page with support for both camera capture and file upload.

## Features Implemented

### 1. **API Integration**
- **File**: `frontend/src/services/api/devices.js`
- **Function**: `uploadPlantPhoto(deviceId, photoFile, plantName)`
- **Endpoint**: `POST /api/devices/devices/{deviceId}/upload-photo/`
- Sends multipart/form-data with plant photo file
- Optional plant name parameter
- Returns updated device data with new photo URL

### 2. **UI Components**

#### **Camera Button in Header**
- Floating camera icon button in device header (top-right corner)
- Styled with semi-transparent white background
- Smooth hover and click animations
- Only visible to device owners

#### **Photo Change Modal**
Two-step interface:

**Step 1: Choose Photo Method**
- **Take Photo**: Opens camera (mobile devices) or webcam (desktop)
  - Uses `capture="environment"` for rear camera on mobile
  - Immediate preview after capture

- **Upload Photo**: Browse device files
  - Accepts image files only (image/*)
  - 5MB file size limit
  - Format validation

**Step 2: Preview & Upload**
- Full preview of selected image
- Two action buttons:
  - "Choose Different Photo" - return to selection
  - "Upload Photo" - confirm and upload
- Real-time upload progress indicator
- Error handling with user-friendly messages

### 3. **Photo Validation**
- ✅ File type checking (must be image)
- ✅ Size limit: 5MB maximum
- ✅ Immediate feedback for validation errors
- ✅ Preview generation before upload

### 4. **State Management**
```javascript
const [showPhotoModal, setShowPhotoModal] = useState(false);
const [photoFile, setPhotoFile] = useState(null);
const [photoPreview, setPhotoPreview] = useState(null);
const [uploadingPhoto, setUploadingPhoto] = useState(false);
const [photoError, setPhotoError] = useState(null);
```

### 5. **User Flow**
1. User clicks camera icon in device header
2. Modal opens with two options (Camera / Upload)
3. User selects photo method
4. Photo preview displays
5. User confirms or chooses different photo
6. Photo uploads to server
7. Device header updates with new image
8. Modal closes automatically on success

## Technical Details

### **Camera Capture (Mobile-Optimized)**
```html
<input
  type="file"
  accept="image/*"
  capture="environment"
  onChange={handleCameraCapture}
/>
```
- `capture="environment"` - Uses rear camera by default
- Works on iOS Safari, Android Chrome, and modern mobile browsers

### **File Upload**
```html
<input
  type="file"
  accept="image/*"
  onChange={handleFileUpload}
/>
```
- Standard file picker
- Cross-platform compatibility

### **Error Handling**
- Network errors
- File validation errors
- Server-side errors
- User-friendly error messages displayed in modal

### **Memory Management**
- Automatic cleanup of blob URLs using `URL.revokeObjectURL()`
- Cleanup on modal close
- Cleanup before new photo selection

## Backend Integration

### **Endpoint**: `/api/devices/devices/{id}/upload-photo/`
- **Method**: POST
- **Auth**: Required (owner or staff only)
- **Content-Type**: multipart/form-data
- **Fields**:
  - `plant_photo`: Image file (required)
  - `plant_name`: String (optional)

### **Response**:
```json
{
  "id": 1,
  "device_name": "My Device",
  "plant_photo_url": "https://example.com/media/device_photos/plant.jpg",
  ...
}
```

## Styling

### **Modal Styles** (`DeviceDetails.css`)
- Responsive design
- Smooth transitions
- SmarTanom green accent colors (#339432)
- Hover effects for better UX
- Mobile-friendly touch targets

### **Edit Button**
- 40px circular button
- Semi-transparent white background
- Blur effect (backdrop-filter)
- Shadow for depth
- Scale animation on hover

## Browser Support

### **Camera Capture**
✅ iOS Safari 11+
✅ Android Chrome 53+
✅ Desktop Chrome/Edge (webcam)
⚠️ Firefox mobile (limited)

### **File Upload**
✅ All modern browsers
✅ IE11+ (with polyfills)

## Security Considerations

1. **Owner-Only Access**: Only device owners can upload photos
2. **File Validation**: Server-side validation of file types
3. **Size Limits**: 5MB client-side, enforced server-side
4. **Authentication**: Required auth token for all requests

## Future Enhancements

### **Potential Improvements**:
- [ ] Image cropping tool before upload
- [ ] Multiple photo gallery per device
- [ ] Image filters/adjustments
- [ ] Compression before upload
- [ ] Progress bar for large files
- [ ] Drag-and-drop support
- [ ] Paste from clipboard

## Testing Checklist

- [x] Camera capture on mobile
- [x] File upload from device
- [x] File size validation (>5MB)
- [x] File type validation (non-image)
- [x] Upload success flow
- [x] Upload error handling
- [x] Modal open/close
- [x] Preview display
- [x] Device header update after upload
- [ ] Network timeout handling
- [ ] Concurrent upload prevention

## Usage Example

```javascript
// User clicks camera button
handleOpenPhotoModal()

// User takes photo or uploads file
handleCameraCapture(event) // or handleFileUpload(event)

// User confirms upload
handleUploadPhoto()
  → uploadPlantPhoto(deviceId, photoFile)
  → Update device state
  → Close modal
```

## Files Modified

1. `frontend/src/services/api/devices.js` - Added uploadPlantPhoto function
2. `frontend/src/pages/DeviceDetails.jsx` - Added photo change UI and logic
3. `frontend/src/assets/styles/DeviceDetails.css` - Added photo modal styles

## Dependencies

- **lucide-react**: Camera, Upload, X icons
- **React hooks**: useState, useEffect
- **Browser APIs**: FileReader, URL.createObjectURL

---

**Created**: October 14, 2025
**Status**: ✅ Complete and functional
**Version**: 1.0.0
