"""Alert detection service for sensor threshold monitoring."""

from __future__ import annotations

import logging
from typing import Optional

from apps.notifications.services import PushNotificationService


logger = logging.getLogger("apps.sensors")


class SensorAlertService:
    """Service for detecting sensor threshold breaches and sending push notifications."""

    # Threshold definitions matching frontend AlertsPage.jsx
    PH_MIN = 5.5
    PH_MAX = 6.5
    TDS_MIN = 800
    TDS_MAX = 1500
    TDS_WARNING_LOW = 999  # 800-999: warning
    TDS_WARNING_HIGH = 1301  # 1301-1500: warning
    WATER_LEVEL_CRITICAL = 0
    WATER_LEVEL_WARNING = 40
    AIR_TEMP_MIN = 18
    AIR_TEMP_MAX = 26
    TURBIDITY_CLEAR = 2100  # > 2100: clear (no alert)
    TURBIDITY_CLOUDY = 1800  # 1800-2100: cloudy (warning)
    # < 1800: turbid (critical)
    LIGHT_HIGH = 1500  # > 1500: critical
    HUMIDITY_MIN = 50
    HUMIDITY_MAX = 70

    @staticmethod
    def check_and_notify(sensor_data) -> Optional[str]:
        """
        Check if sensor data breaches thresholds and send push notification.

        Args:
            sensor_data: SensorData instance with sensor.device.bound_email

        Returns:
            str: Alert message if notification sent, None otherwise
        """
        from apps.accounts.models import User

        sensor = sensor_data.sensor
        value = sensor_data.value
        sensor_type = sensor.sensor_type
        device = sensor.device
        user_email = device.bound_email

        if not user_email:
            logger.debug(f"Device {device.id} has no bound user, skipping notification")
            return None

        # Get user object from email
        try:
            user = User.objects.get(email=user_email)
        except User.DoesNotExist:
            logger.warning(f"User with email {user_email} not found for device {device.id}")
            return None

        alert_info = SensorAlertService._detect_alert(sensor_type, value)

        if not alert_info:
            return None

        # Alert detected, send push notification
        severity = alert_info["severity"]
        title = alert_info["title"]
        body = alert_info["body"]

        logger.info(
            f"Alert detected: {sensor_type}={value} for device {device.id} ({device.device_name}), "
            f"severity={severity}"
        )

        # Broadcast alert via WebSocket to all connected clients
        from channels.layers import get_channel_layer
        from asgiref.sync import async_to_sync
        from django.utils import timezone

        channel_layer = get_channel_layer()
        if channel_layer:
            alert_payload = {
                "type": "alert.new",
                "device_id": device.id,
                "device_serial": device.device_serial,
                "device_name": device.device_name,
                "timestamp": timezone.now().isoformat(),
                "alert": {
                    "sensor_type": sensor_type,
                    "value": float(value),
                    "severity": severity,
                    "title": title,
                    "body": body,
                    "reading_id": sensor_data.id,
                    "is_read": False,
                }
            }

            # Broadcast to global devices group
            async_to_sync(channel_layer.group_send)(
                "devices",
                {
                    "type": "alert_update",
                    "payload": alert_payload
                }
            )

            # Broadcast to user-specific channel if device is bound
            if user:
                async_to_sync(channel_layer.group_send)(
                    f"user_{user.id}",
                    {
                        "type": "alert_update",
                        "payload": alert_payload
                    }
                )

        # Send push/email notification to device owner
        result = PushNotificationService.send_alert_notification(
            user=user,
            alert_title=title,
            alert_message=body,
            alert_type=severity,
            device_id=device.id,
        )

        # Log owner delivery summary
        if result:
            logger.info(
                f"Owner notify summary for {user.email}: push_sent={result.get('sent', 0)}, push_failed={result.get('failed', 0)}"
            )
        else:
            logger.warning(f"No result returned from PushNotificationService for {user.email}")

        # Always broadcast to admins who opted in to receive all device alerts (email and/or push)
        try:
            PushNotificationService.send_to_all_admins(
                title=f"🌱 {title}",
                message=body,
                notification_type=severity,
                url=f"/alerts?device={device.id}",
                data={'device_id': device.id, 'alert_type': severity}
            )
        except Exception as e:
            logger.error(f"Failed to broadcast alert to admins: {e}")

        return body

    @staticmethod
    def _detect_alert(sensor_type: str, value: float) -> Optional[dict]:
        """
        Detect if a sensor value breaches thresholds.

        Returns:
            dict with keys: severity, title, body
            or None if no alert
        """
        # pH alerts
        if sensor_type == "ph":
            if value < SensorAlertService.PH_MIN:
                return {
                    "severity": "critical",
                    "title": "Low pH Detected",
                    "body": (
                        f"pH is {value:.1f} (below {SensorAlertService.PH_MIN}). "
                        "Raise pH using pH Up solution, mix thoroughly, and re-check in 10-15 minutes."
                    ),
                }
            elif value > SensorAlertService.PH_MAX:
                return {
                    "severity": "critical",
                    "title": "High pH Detected",
                    "body": (
                        f"pH is {value:.1f} (above {SensorAlertService.PH_MAX}). "
                        "Lower pH using pH Down solution, mix thoroughly, and re-check in 10-15 minutes."
                    ),
                }

        # TDS alerts
        elif sensor_type == "tds":
            if value < SensorAlertService.TDS_MIN:
                return {
                    "severity": "critical",
                    "title": "TDS Critically Low",
                    "body": (
                        f"TDS is {value:.0f} ppm (below {SensorAlertService.TDS_MIN}). "
                        "Solution is too weak. Increase nutrient concentration and re-check."
                    ),
                }
            elif value < SensorAlertService.TDS_WARNING_LOW:
                return {
                    "severity": "warning",
                    "title": "TDS Low Warning",
                    "body": (
                        f"TDS is {value:.0f} ppm (approaching lower bound). "
                        "Monitor and consider topping up nutrients."
                    ),
                }
            elif value > SensorAlertService.TDS_MAX:
                return {
                    "severity": "critical",
                    "title": "TDS Critically High",
                    "body": (
                        f"TDS is {value:.0f} ppm (above {SensorAlertService.TDS_MAX}). "
                        "Solution is too concentrated. Drain/refill with fresh solution."
                    ),
                }
            elif value > SensorAlertService.TDS_WARNING_HIGH:
                return {
                    "severity": "warning",
                    "title": "TDS High Warning",
                    "body": (
                        f"TDS is {value:.0f} ppm (approaching upper bound). "
                        "Consider diluting the solution or reducing dosing frequency."
                    ),
                }

        # Water level alerts
        elif sensor_type == "water_level":
            if value == SensorAlertService.WATER_LEVEL_CRITICAL:
                return {
                    "severity": "critical",
                    "title": "Water Level Empty",
                    "body": (
                        "Water level is 0% — reservoir empty. Refill with fresh nutrient solution immediately, "
                        "check pumps for priming issues, and inspect for leaks."
                    ),
                }
            elif value <= SensorAlertService.WATER_LEVEL_WARNING:
                return {
                    "severity": "warning",
                    "title": "Low Water Level",
                    "body": (
                        f"Water level is {value:.0f}% (below {SensorAlertService.WATER_LEVEL_WARNING}%). "
                        "Refill soon and verify auto-refill settings or inspect for slow leaks."
                    ),
                }

        # Air temperature alerts
        elif sensor_type == "air_temperature":
            if value < SensorAlertService.AIR_TEMP_MIN:
                return {
                    "severity": "warning",
                    "title": "Low Air Temperature",
                    "body": (
                        f"Air temperature is {value:.1f}°C (below {SensorAlertService.AIR_TEMP_MIN}°C). "
                        "Increase heating or insulation."
                    ),
                }
            elif value > SensorAlertService.AIR_TEMP_MAX:
                return {
                    "severity": "warning",
                    "title": "High Air Temperature",
                    "body": (
                        f"Air temperature is {value:.1f}°C (above {SensorAlertService.AIR_TEMP_MAX}°C). "
                        "Improve ventilation or add cooling."
                    ),
                }

        # Turbidity alerts
        elif sensor_type == "turbidity":
            if value > SensorAlertService.TURBIDITY_CLEAR:
                # Clear water, no alert
                return None
            elif value > SensorAlertService.TURBIDITY_CLOUDY:
                return {
                    "severity": "warning",
                    "title": "Water Cloudy",
                    "body": (
                        f"Turbidity is {value:.0f} (cloudy range). "
                        "Clean filters and consider partial water change."
                    ),
                }
            else:
                return {
                    "severity": "critical",
                    "title": "Water Turbid",
                    "body": (
                        f"Turbidity is {value:.0f} (turbid). "
                        "Drain/refill, clean filters and tubing."
                    ),
                }

        # Light alerts
        elif sensor_type == "light":
            if value > SensorAlertService.LIGHT_HIGH:
                return {
                    "severity": "critical",
                    "title": "Very Bright Light Detected",
                    "body": (
                        f"Light is {value:.0f} lux (above {SensorAlertService.LIGHT_HIGH}). "
                        "Provide shading or reduce lighting."
                    ),
                }

        # Humidity alerts
        elif sensor_type == "humidity":
            if value < SensorAlertService.HUMIDITY_MIN:
                return {
                    "severity": "warning",
                    "title": "Low Humidity Detected",
                    "body": (
                        f"Humidity is {value:.0f}% (below {SensorAlertService.HUMIDITY_MIN}%). "
                        "Increase humidity (misters, trays, humidifier)."
                    ),
                }
            elif value > SensorAlertService.HUMIDITY_MAX:
                return {
                    "severity": "warning",
                    "title": "High Humidity Detected",
                    "body": (
                        f"Humidity is {value:.0f}% (above {SensorAlertService.HUMIDITY_MAX}%). "
                        "Improve ventilation or dehumidify."
                    ),
                }

        return None
