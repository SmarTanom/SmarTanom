"""Alert detection service for sensor threshold monitoring."""

from __future__ import annotations

import logging
from typing import Optional

from apps.notifications.services import PushNotificationService
from apps.notifications.models import Alert


logger = logging.getLogger("apps.sensors")


class SensorAlertService:
    """Service for detecting sensor threshold breaches and sending push notifications."""

    # Threshold definitions matching frontend AlertsPage.jsx
    PH_MIN = 5.5
    PH_MAX = 6.5
    # Default TDS thresholds (used only as fallback when no plant is associated)
    TDS_MIN = 800
    TDS_MAX = 1500
    TDS_WARNING_LOW = 999  # 800-999: warning (fallback)
    TDS_WARNING_HIGH = 1301  # 1301-1500: warning (fallback)
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
        """Check thresholds for a SensorData row and create/send alert if needed."""
        from apps.accounts.models import User

        sensor = sensor_data.sensor
        value = sensor_data.value
        sensor_type = sensor.sensor_type
        device = sensor.device
        user_email = device.bound_email

        if not user_email:
            logger.debug(f"Device {device.id} has no bound user, skipping notification")
            return None

        # Get user object from email (optimized lookup)
        try:
            user = User.objects.only('id', 'email').get(email=user_email)
        except User.DoesNotExist:
            logger.warning(f"User with email {user_email} not found for device {device.id}")
            return None

        # Derive plant-aware thresholds when possible
        plant_ranges = None
        try:
            if sensor_type in {"tds", "ec", "ph", "water_temperature", "light", "humidity", "air_temperature"}:
                # Resolve the most recent reservoir for this device to get plant ranges
                from apps.reservoirs.models import Reservoir
                reservoir = (
                    Reservoir.objects.select_related("plant")
                    .filter(device=device)
                    .order_by("-start_date", "-created_at")
                    .first()
                )
                plant = getattr(reservoir, "plant", None) if reservoir else None
                if plant:
                    plant_ranges = {
                        "ppm_min": float(plant.ppm_min),
                        "ppm_max": float(plant.ppm_max),
                        "ec_min": float(plant.ec_min),
                        "ec_max": float(plant.ec_max),
                        "ph_min": float(plant.ph_min),
                        "ph_max": float(plant.ph_max),
                        "water_temp_min": float(plant.water_temp_min),
                        "water_temp_max": float(plant.water_temp_max),
                        "light_min": float(plant.light_min),
                        "light_max": float(plant.light_max),
                        "environment_temp_min": float(plant.environment_temp_min),
                        "environment_temp_max": float(plant.environment_temp_max),
                        "humidity_min": float(plant.humidity_min),
                        "humidity_max": float(plant.humidity_max),
                        "plant_name": plant.plant_name,
                        "plant_id": plant.id,
                        "reservoir_id": reservoir.id if reservoir else None,
                    }
        except Exception:
            # Non-fatal; fall back to static thresholds
            plant_ranges = None

        alert_info = SensorAlertService._detect_alert(sensor_type, value, plant_ranges)

        if not alert_info:
            return None

        # Alert detected, prepare content
        severity = alert_info["severity"]
        title = alert_info["title"]
        body = alert_info["body"]
        classification = alert_info.get("classification", "normal")
        threshold_min = alert_info.get("threshold_min")
        threshold_max = alert_info.get("threshold_max")
        domain = alert_info.get("domain", sensor_type)

        # Build plant-specific recommendation text (kept short)
        def _plant_reco(plant_name: Optional[str], domain_key: str, cls: str) -> str:
            mapping = {
                "Lettuce": {
                    "general": "Keep roots cool and solution well oxygenated.",
                    "ph": {
                        "below_min": "Raise slowly; aim 5.8–6.2.",
                        "above_max": "High pH reduces uptake; adjust 0.2 each time.",
                        "near_min": "Buffer with small pH Up dose.",
                        "near_max": "Monitor—drifting high risks tip burn.",
                    },
                    "tds": {
                        "below_min": "Increase EC gradually (+≤100 ppm).",
                        "above_max": "Dilute to mid‑range to avoid bitterness.",
                        "near_min": "Plan a mild nutrient top‑up soon.",
                        "near_max": "If pale or curled, dilute slightly.",
                    },
                    "ec": {
                        "below_min": "Increase EC 0.2–0.3 mS/cm; re‑test.",
                        "above_max": "Dilute to mid‑range; avoid lockout.",
                        "near_min": "Schedule a mild top‑up.",
                        "near_max": "Watch for burn signs.",
                    },
                    "light": {
                        "below_min": "Add light or reduce shading.",
                        "above_max": "Raise/diffuse fixture to reduce tip burn.",
                        "near_min": "Consider extending photoperiod.",
                        "near_max": "Watch edge curl—raise lights if needed.",
                    },
                    "environment_temp": {
                        "below_min": "Warm incoming air; avoid drafts.",
                        "above_max": "Ventilate or shade—risk of bolting.",
                        "near_min": "Pre‑warm if trend continues.",
                        "near_max": "Improve airflow to stabilize temp.",
                    },
                    "water_temperature": {
                        "below_min": "Insulate reservoir; cold slows uptake.",
                        "above_max": "Consider chilling; warm lowers oxygen.",
                        "near_min": "Monitor nightly lows; add insulation.",
                        "near_max": "Aerate more or cool top‑up.",
                    },
                    "humidity": {
                        "below_min": "Add gentle misting to reduce stress.",
                        "above_max": "Add airflow / dehumidify to prevent mildew.",
                        "near_min": "If midday wilt, raise RH slightly.",
                        "near_max": "Ensure leaves dry before dark.",
                    },
                },
                "Basil": {
                    "general": "Prune consistently to improve airflow.",
                    "ph": {
                        "below_min": "Raise gradually to protect aroma.",
                        "above_max": "Lower slowly; high pH reduces micros.",
                        "near_min": "Small pH Up micro‑dose.",
                        "near_max": "If trending up, partial dilution.",
                    },
                    "tds": {
                        "below_min": "Mild boost supports leaf mass.",
                        "above_max": "Dilute 10–20% to avoid dull flavor.",
                        "near_min": "Mild feed if new growth is pale.",
                        "near_max": "High EC + heat: ensure airflow.",
                    },
                    "ec": {
                        "below_min": "Add balanced nutrients moderately.",
                        "above_max": "Dilute 10–20% to reduce stress.",
                        "near_min": "Consider mild feed.",
                        "near_max": "Maintain airflow to prevent stress.",
                    },
                    "light": {
                        "below_min": "Increase PPFD for compact growth.",
                        "above_max": "Raise fixture to avoid chlorosis.",
                        "near_min": "Extend photoperiod a little.",
                        "near_max": "Diffuse if leaf curl appears.",
                    },
                    "environment_temp": {
                        "below_min": "Avoid cold drafts; basil slows when cool.",
                        "above_max": "Vent promptly; heat+RH invites fungus.",
                        "near_min": "Buffer cool nights with thermal mass.",
                        "near_max": "Improve evaporative cooling or shade.",
                    },
                    "water_temperature": {
                        "below_min": "Gently warm; cold reduces root vigor.",
                        "above_max": "Cool solution to lower pathogen risk.",
                        "near_min": "Insulate lines if chill recurs.",
                        "near_max": "Increase aeration to maintain oxygen.",
                    },
                    "humidity": {
                        "below_min": "Raise RH slightly; protect tender tips.",
                        "above_max": "Dehumidify now; downy mildew risk.",
                        "near_min": "Watch for leaf edge dry‑out.",
                        "near_max": "Ensure canopy dries before dark.",
                    },
                },
                "Pechay": {
                    "general": "Keep solution fresh; steady feed and airflow.",
                    "ph": {
                        "below_min": "Raise toward mid‑6s slowly.",
                        "above_max": "Lower by ~0.2 and re‑test.",
                        "near_min": "Small pH Up dose; monitor.",
                        "near_max": "Plan gentle pH Down if drifting up.",
                    },
                    "tds": {
                        "below_min": "Increase EC gradually; watch color.",
                        "above_max": "Dilute to prevent bitterness/tip burn.",
                        "near_min": "Schedule a modest top‑up soon.",
                        "near_max": "If edges curl/brown, dilute slightly.",
                    },
                    "ec": {
                        "below_min": "Increase EC ≈0.2–0.3; re‑test.",
                        "above_max": "Dilute to avoid salt stress.",
                        "near_min": "Plan a mild feed.",
                        "near_max": "Monitor for burn; dilute a bit.",
                    },
                    "light": {
                        "below_min": "Provide bright even light; reduce shade.",
                        "above_max": "Diffuse/raise fixture to avoid scorch.",
                        "near_min": "Extend photoperiod slightly.",
                        "near_max": "Raise/dim lights if curling.",
                    },
                    "environment_temp": {
                        "below_min": "Reduce drafts; gently heat.",
                        "above_max": "Ventilate or shade to avoid bolting.",
                        "near_min": "Buffer nights with thermal mass.",
                        "near_max": "Enhance airflow to stabilize temp.",
                    },
                    "water_temperature": {
                        "below_min": "Warm solution; cold slows uptake.",
                        "above_max": "Cool solution; consider partial swap.",
                        "near_min": "Insulate if nightly lows persist.",
                        "near_max": "Aerate more or add cooler top‑up.",
                    },
                    "humidity": {
                        "below_min": "Raise RH modestly to reduce stress.",
                        "above_max": "Increase airflow; mildew‑prone.",
                        "near_min": "Bump RH slightly if midday wilt.",
                        "near_max": "Ensure leaves dry before dark.",
                    },
                },
                "Generic": {
                    "general": "Keep conditions stable; small adjustments.",
                    "ph": {
                        "below_min": "Raise gradually toward mid‑range.",
                        "above_max": "Lower slowly (~0.2 steps).",
                        "near_min": "Small pH Up may help.",
                        "near_max": "Plan gentle pH Down if rising.",
                    },
                    "tds": {
                        "below_min": "Increase nutrients gradually.",
                        "above_max": "Dilute or partial drain/refill.",
                        "near_min": "Plan a mild top‑up.",
                        "near_max": "Slight dilution if burn symptoms.",
                    },
                    "ec": {
                        "below_min": "Increase EC in small steps.",
                        "above_max": "Dilute to mid‑range.",
                        "near_min": "Mild feed if trending down.",
                        "near_max": "Slight dilution if trending up.",
                    },
                    "light": {
                        "below_min": "Add light or reduce shading.",
                        "above_max": "Raise/diffuse to reduce stress.",
                        "near_min": "Extend photoperiod slightly.",
                        "near_max": "Back off intensity if bleaching.",
                    },
                    "environment_temp": {
                        "below_min": "Warm space; cut drafts.",
                        "above_max": "Improve cooling/ventilation.",
                        "near_min": "Stabilize nights; monitor.",
                        "near_max": "Increase airflow.",
                    },
                    "water_temperature": {
                        "below_min": "Insulate or gently warm reservoir.",
                        "above_max": "Cool solution and boost aeration.",
                        "near_min": "Prepare heating if needed.",
                        "near_max": "Partial swap with cooler water; aerate.",
                    },
                    "humidity": {
                        "below_min": "Raise RH slightly.",
                        "above_max": "Dehumidify or increase airflow.",
                        "near_min": "Increase RH a bit if edges dry.",
                        "near_max": "Ensure canopy dries before lights‑off.",
                    },
                },
            }

            if not plant_name:
                plant_name = "Generic"
            plant_map = mapping.get(plant_name, mapping["Generic"])
            # Normalize domains
            dom = domain_key
            if dom == "air_temperature":
                dom = "environment_temp"
            domain_map = plant_map.get(dom)
            if not domain_map:
                return plant_map.get("general", "")
            return domain_map.get(cls) or plant_map.get("general", "")

        recommendation = _plant_reco((plant_ranges or {}).get("plant_name"), domain, classification)

        logger.info(
            f"Alert detected: {sensor_type}={value} for device {device.id} ({device.device_name}), severity={severity}"
        )

        # Broadcast alert via WebSocket to appropriate connected clients
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

            # Broadcast to global devices group (for admins and dashboard)
            async_to_sync(channel_layer.group_send)(
                "devices",
                {
                    "type": "alert_update",
                    "payload": alert_payload
                }
            )

            # Broadcast to device owner's specific channel only
            if user:
                async_to_sync(channel_layer.group_send)(
                    f"user_{user.id}",
                    {
                        "type": "alert_update",
                        "payload": alert_payload
                    }
                )
                logger.info(f"[WebSocket] Alert broadcasted to device owner {user.email} for device {device.device_serial}")
            else:
                logger.info(f"[WebSocket] Alert broadcasted to global group only (no device owner) for device {device.device_serial}")

        # Persist canonical Alert row (used by Alerts UI)
        try:
            alert_row = Alert.objects.create(
                user=user,
                device=device,
                reservoir_id=(plant_ranges or {}).get("reservoir_id"),
                plant_id=(plant_ranges or {}).get("plant_id"),
                sensor=sensor,
                reading=sensor_data,
                sensor_type=sensor_type,
                metric_name=sensor_type,
                measured_value=float(value),
                unit=sensor.unit,
                threshold_min=threshold_min,
                threshold_max=threshold_max,
                classification=classification,
                severity=severity,
                title=title,
                message=body,
                recommendation=recommendation,
                is_read=False,
            )
            logger.info(f"Alert row created id={alert_row.id} ({severity} {sensor_type})")
        except Exception as e:
            logger.error(f"Failed to persist Alert row: {e}")

        # Create NotificationLog entry for the alert (delivery telemetry)
        from apps.notifications.models import NotificationLog
        try:
            notification_log = NotificationLog.objects.create(
                user=user,
                notification_type=severity,
                title=title,
                message=body,
                status='sent',
                metadata={
                    'device_id': device.id,
                    'device_serial': device.device_serial,
                    'sensor_type': sensor_type,
                    'sensor_value': float(value),
                    'alert_id': sensor_data.id
                }
            )
            logger.info(f"Created NotificationLog entry {notification_log.id} for alert: {title}")
        except Exception as e:
            logger.error(f"Failed to create NotificationLog entry: {e}")

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

        # Only broadcast to admins if this is a critical alert or if it's an unbound device
        # For user-owned devices, only send to the device owner to avoid spam
        if severity == 'critical' or not device.is_bound:
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
        else:
            logger.info(f"Skipping admin broadcast for {severity} alert on user-owned device {device.id}")

        return body

    @staticmethod
    def _detect_alert(sensor_type: str, value: float, plant_ranges: Optional[dict] = None) -> Optional[dict]:
        """
        Detect if a sensor value breaches thresholds.

        Returns:
            dict with keys: severity, title, body
            or None if no alert
        """
        # pH alerts
        if sensor_type == "ph":
            # Prefer plant-specific thresholds when available
            ph_min = plant_ranges.get("ph_min") if plant_ranges else SensorAlertService.PH_MIN
            ph_max = plant_ranges.get("ph_max") if plant_ranges else SensorAlertService.PH_MAX
            buf = 0.2  # proximity buffer for near_min / near_max
            if value < ph_min:
                return {
                    "severity": "critical",
                    "title": "Low pH Detected",
                    "body": (f"pH is {value:.1f} (below {ph_min}). Raise pH using pH Up, mix thoroughly, and re‑check."),
                    "classification": "below_min",
                    "threshold_min": ph_min,
                    "threshold_max": ph_max,
                }
            elif value <= (ph_min + buf):
                return {
                    "severity": "warning",
                    "title": "pH approaching low boundary",
                    "body": (f"pH {value:.1f} nearing lower limit ({ph_min}). Consider a small pH Up correction."),
                    "classification": "near_min",
                    "threshold_min": ph_min,
                    "threshold_max": ph_max,
                }
            elif value > ph_max:
                return {
                    "severity": "critical",
                    "title": "High pH Detected",
                    "body": (f"pH is {value:.1f} (above {ph_max}). Lower pH using pH Down, mix and re‑check."),
                    "classification": "above_max",
                    "threshold_min": ph_min,
                    "threshold_max": ph_max,
                }
            elif value >= (ph_max - buf):
                return {
                    "severity": "warning",
                    "title": "pH approaching high boundary",
                    "body": (f"pH {value:.1f} nearing upper limit ({ph_max}). Monitor trend; small pH Down may help."),
                    "classification": "near_max",
                    "threshold_min": ph_min,
                    "threshold_max": ph_max,
                }

        # TDS alerts
        elif sensor_type == "tds":
            # Use plant-aware ranges if available; otherwise fallback to static
            ppm_min = plant_ranges.get("ppm_min") if plant_ranges else SensorAlertService.TDS_MIN
            ppm_max = plant_ranges.get("ppm_max") if plant_ranges else SensorAlertService.TDS_MAX
            # Compute symmetric proximity buffer: 10% of span clamped to [50, 200]
            span = max(0.0, float(ppm_max) - float(ppm_min))
            base_buf = span * 0.1
            buf = max(50.0, min(200.0, base_buf))

            if value < ppm_min:
                return {
                    "severity": "critical",
                    "title": "TDS below optimal range",
                    "body": (
                        f"TDS is {value:.0f} ppm which is below the optimal range ({ppm_min:.0f}–{ppm_max:.0f} ppm)"
                        + (f" for {plant_ranges.get('plant_name')}" if plant_ranges and plant_ranges.get("plant_name") else "")
                        + ". Increase nutrient concentration gradually and re-check."
                    ),
                }
            elif value <= (ppm_min + buf):
                return {
                    "severity": "warning",
                    "title": "TDS approaching low boundary",
                    "body": (
                        f"TDS is {value:.0f} ppm and nearing the lower limit ({ppm_min:.0f} ppm)"
                        + (f" for {plant_ranges.get('plant_name')}" if plant_ranges and plant_ranges.get("plant_name") else "")
                        + ". Monitor and consider a mild nutrient top-up."
                    ),
                }
            elif value > ppm_max:
                return {
                    "severity": "critical",
                    "title": "TDS above optimal range",
                    "body": (
                        f"TDS is {value:.0f} ppm which is above the optimal range ({ppm_max:.0f} ppm max)"
                        + (f" for {plant_ranges.get('plant_name')}" if plant_ranges and plant_ranges.get("plant_name") else "")
                        + ". Dilute or perform a partial drain/refill and re-check."
                    ),
                }
            elif value >= (ppm_max - buf):
                return {
                    "severity": "warning",
                    "title": "TDS approaching high boundary",
                    "body": (
                        f"TDS is {value:.0f} ppm and nearing the upper limit ({ppm_max:.0f} ppm)"
                        + (f" for {plant_ranges.get('plant_name')}" if plant_ranges and plant_ranges.get("plant_name") else "")
                        + ". Monitor and consider dilution if trend continues."
                    ),
                    "classification": "near_max",
                    "threshold_min": ppm_min,
                    "threshold_max": ppm_max,
                }

        # EC alerts (plant-specific when available)
        elif sensor_type == "ec":
            if plant_ranges and plant_ranges.get("ec_min") and plant_ranges.get("ec_max"):
                ec_min = plant_ranges.get("ec_min")
                ec_max = plant_ranges.get("ec_max")
            else:
                # Derive EC approx from ppm if provided; otherwise fallback to generic 0.8-1.2
                if plant_ranges and plant_ranges.get("ppm_min") and plant_ranges.get("ppm_max"):
                    ec_min = round(float(plant_ranges["ppm_min"]) / 700.0, 2)
                    ec_max = round(float(plant_ranges["ppm_max"]) / 700.0, 2)
                else:
                    ec_min, ec_max = 0.8, 1.2
            span = max(0.0, float(ec_max) - float(ec_min))
            buf = max(0.05, min(0.2, span * 0.1))

            if value < ec_min:
                return {
                    "severity": "critical",
                    "title": "EC below optimal range",
                    "body": f"EC is {value:.2f} mS/cm (below {ec_min:.2f}–{ec_max:.2f}). Increase gradually and re‑test.",
                    "classification": "below_min",
                    "threshold_min": ec_min,
                    "threshold_max": ec_max,
                }
            elif value <= (ec_min + buf):
                return {
                    "severity": "warning",
                    "title": "EC approaching low boundary",
                    "body": f"EC {value:.2f} mS/cm near lower limit ({ec_min:.2f}). Consider mild feed.",
                    "classification": "near_min",
                    "threshold_min": ec_min,
                    "threshold_max": ec_max,
                }
            elif value > ec_max:
                return {
                    "severity": "critical",
                    "title": "EC above optimal range",
                    "body": f"EC is {value:.2f} mS/cm (above {ec_max:.2f}). Dilute to mid‑range and re‑test.",
                    "classification": "above_max",
                    "threshold_min": ec_min,
                    "threshold_max": ec_max,
                }
            elif value >= (ec_max - buf):
                return {
                    "severity": "warning",
                    "title": "EC approaching high boundary",
                    "body": f"EC {value:.2f} mS/cm near upper limit ({ec_max:.2f}). Monitor and consider dilution.",
                    "classification": "near_max",
                    "threshold_min": ec_min,
                    "threshold_max": ec_max,
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

        # Air/environment temperature alerts (prefer plant environment ranges)
        elif sensor_type == "air_temperature":
            env_min = (plant_ranges or {}).get("environment_temp_min", SensorAlertService.AIR_TEMP_MIN)
            env_max = (plant_ranges or {}).get("environment_temp_max", SensorAlertService.AIR_TEMP_MAX)
            buf = 0.5
            if value < env_min:
                return {
                    "severity": "warning",
                    "title": "Low Air Temperature",
                    "body": (f"Air temperature is {value:.1f}°C (below {env_min}°C). Increase heating or insulation."),
                    "classification": "below_min",
                    "threshold_min": env_min,
                    "threshold_max": env_max,
                }
            elif value <= (env_min + buf):
                return {
                    "severity": "info",
                    "title": "Air temp nearing low bound",
                    "body": (f"Air temp {value:.1f}°C near lower limit ({env_min}°C). Monitor nighttime lows."),
                    "classification": "near_min",
                    "threshold_min": env_min,
                    "threshold_max": env_max,
                }
            elif value > env_max:
                return {
                    "severity": "warning",
                    "title": "High Air Temperature",
                    "body": (f"Air temperature is {value:.1f}°C (above {env_max}°C). Improve ventilation or add cooling."),
                    "classification": "above_max",
                    "threshold_min": env_min,
                    "threshold_max": env_max,
                }
            elif value >= (env_max - buf):
                return {
                    "severity": "info",
                    "title": "Air temp nearing high bound",
                    "body": (f"Air temp {value:.1f}°C near upper limit ({env_max}°C). Increase airflow."),
                    "classification": "near_max",
                    "threshold_min": env_min,
                    "threshold_max": env_max,
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

        # Light alerts (prefer plant ranges)
        elif sensor_type == "light":
            lmin = (plant_ranges or {}).get("light_min", None)
            lmax = (plant_ranges or {}).get("light_max", SensorAlertService.LIGHT_HIGH)
            if lmin is None:
                # Only upper-bound known
                if value > SensorAlertService.LIGHT_HIGH:
                    return {
                        "severity": "critical",
                        "title": "Very Bright Light Detected",
                        "body": (
                            f"Light is {value:.0f} lux (above {SensorAlertService.LIGHT_HIGH}). "
                            "Provide shading or reduce lighting."
                        ),
                        "classification": "above_max",
                        "threshold_max": SensorAlertService.LIGHT_HIGH,
                    }
            else:
                span = max(0.0, float(lmax) - float(lmin))
                buf = max(50.0, min(500.0, span * 0.1))
                if value < lmin:
                    return {
                        "severity": "warning",
                        "title": "Low Light",
                        "body": f"Light {value:.0f} lux (below {lmin:.0f}). Increase light or reduce shading.",
                        "classification": "below_min",
                        "threshold_min": lmin,
                        "threshold_max": lmax,
                    }
                elif value <= (lmin + buf):
                    return {
                        "severity": "info",
                        "title": "Light nearing low bound",
                        "body": f"Light {value:.0f} lux near lower limit ({lmin:.0f}). Consider extending photoperiod.",
                        "classification": "near_min",
                        "threshold_min": lmin,
                        "threshold_max": lmax,
                    }
                elif value > lmax:
                    return {
                        "severity": "critical",
                        "title": "Light above optimal range",
                        "body": f"Light {value:.0f} lux (above {lmax:.0f}). Raise or diffuse fixture.",
                        "classification": "above_max",
                        "threshold_min": lmin,
                        "threshold_max": lmax,
                    }
                elif value >= (lmax - buf):
                    return {
                        "severity": "warning",
                        "title": "Light nearing high bound",
                        "body": f"Light {value:.0f} lux near upper limit ({lmax:.0f}). Monitor for stress.",
                        "classification": "near_max",
                        "threshold_min": lmin,
                        "threshold_max": lmax,
                    }
                # No alert if within bounds
                return None

        # Humidity alerts (prefer plant ranges)
        elif sensor_type == "humidity":
            hmin = (plant_ranges or {}).get("humidity_min", SensorAlertService.HUMIDITY_MIN)
            hmax = (plant_ranges or {}).get("humidity_max", SensorAlertService.HUMIDITY_MAX)
            buf = 2.0
            if value < hmin:
                return {
                    "severity": "warning",
                    "title": "Low Humidity Detected",
                    "body": (f"Humidity is {value:.0f}% (below {hmin}%). Increase humidity (misters, trays)."),
                    "classification": "below_min",
                    "threshold_min": hmin,
                    "threshold_max": hmax,
                }
            elif value <= (hmin + buf):
                return {
                    "severity": "info",
                    "title": "Humidity nearing low bound",
                    "body": (f"Humidity {value:.0f}% near lower limit ({hmin}%). Monitor leaf edges."),
                    "classification": "near_min",
                    "threshold_min": hmin,
                    "threshold_max": hmax,
                }
            elif value > hmax:
                return {
                    "severity": "warning",
                    "title": "High Humidity Detected",
                    "body": (f"Humidity is {value:.0f}% (above {hmax}%). Improve ventilation or dehumidify."),
                    "classification": "above_max",
                    "threshold_min": hmin,
                    "threshold_max": hmax,
                }
            elif value >= (hmax - buf):
                return {
                    "severity": "info",
                    "title": "Humidity nearing high bound",
                    "body": (f"Humidity {value:.0f}% near upper limit ({hmax}%). Ensure canopy dries before dark."),
                    "classification": "near_max",
                    "threshold_min": hmin,
                    "threshold_max": hmax,
                }

        return None
