"""Alert detection service for sensor threshold monitoring."""

from __future__ import annotations

import logging
from typing import Optional
from datetime import timedelta

from apps.notifications.services import PushNotificationService
from django.utils import timezone
from typing import Tuple
from django.conf import settings


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
    # Turbidity thresholds now use NTU (0..1000) after ingestion converts RAW to NTU
    # Firmware mapping: voltage > 1.0V => ~<800 NTU (Clear), ~800-1000 NTU (Cloudy), >=1000 NTU (Turbid)
    TURBIDITY_CLEAR_NTU = 800
    TURBIDITY_CLOUDY_NTU = 1000
    # < 1800: turbid (critical)
    # Removed environment sensors (air temp, humidity, light)

    # Plant-specific recommendation templates
    PLANT_RECOMMENDATION_TEMPLATES = {
        "Lettuce": {
            "general": "Keep roots cool and solution well oxygenated.",
            "ph": {
                "below_min": "Raise slowly to avoid nutrient lockout; aim 5.8–6.2.",
                "above_max": "Slightly high pH can reduce iron uptake; adjust 0.2 at a time.",
                "near_min": "Trend downward? Buffer with small pH Up dose.",
                "near_max": "Monitor — drifting high may cause tip burn risk.",
            },
            "tds": {
                "below_min": "Increase EC gradually (no more than +100 ppm per adjustment).",
                "above_max": "Dilute to avoid bitterness; target mid‑range.",
                "near_min": "Plan a mild nutrient top-up soon.",
                "near_max": "If leaves pale or edges curl, dilute slightly.",
            },
            "ec": {
                "below_min": "Increase EC gradually (0.2-0.3 mS/cm per adjustment).",
                "above_max": "Dilute to avoid nutrient lockout; target mid‑range.",
                "near_min": "Plan a mild nutrient top-up soon.",
                "near_max": "Monitor for signs of nutrient burn.",
            },
            "light": {
                "below_min": "Add supplemental light or reduce canopy shading.",
                "above_max": "Too intense light can cause tip burn; raise fixture or diffuse.",
                "near_min": "Consider extending photoperiod if growth slows.",
                "near_max": "Watch for leaf edge curl — may need to raise lights.",
            },
            "environment_temp": {
                "below_min": "Cool air slows growth — ensure adequate circulation but avoid drafts.",
                "above_max": "High heat risks bolting — increase ventilation or shading.",
                "near_min": "If trend continues, pre‑warm incoming air.",
                "near_max": "Improve airflow to stabilize temperature.",
            },
            "water_temperature": {
                "below_min": "Cold roots slow nutrient uptake — insulate reservoir.",
                "above_max": "Warm solution lowers dissolved oxygen; consider chilling.",
                "near_min": "Monitor nightly lows; add insulation if dropping further.",
                "near_max": "Aerate more or partially replace with cooler water.",
            },
            "humidity": {
                "below_min": "Low RH increases transpiration — add gentle misting.",
                "above_max": "High RH risks mildew — add airflow / dehumidify.",
                "near_min": "If leaves wilt mid‑day, raise RH slightly.",
                "near_max": "Ensure leaves dry before dark period.",
            },
        },
        "Lettuce_Germination": {
            "general": "Fill reservoir with clean, pH-balanced water (5.5-6.0). Keep solution temperature stable (18-24°C) and aerated, even if using plain water, to prevent stagnation.",
            "ph": {
            "below_min": "Too acidic for germination. Raise slowly; aim 5.5–6.0.",
            "above_max": "Too alkaline. Gently lower to 5.5-6.0 range.",
            "near_min": "Monitor closely. Buffer with a very small pH Up dose if trend continues.",
            "near_max": "Monitor. Drifting high can affect initial root nutrient uptake."
            },
            "tds": {
            "below_min": "Nutrients low (OK for sprouting). Introduce 1/4 strength solution only after cotyledons appear.",
            "above_max": "Too high! High salts can kill new roots. Dilute reservoir with plain pH'd water.",
            "near_min": "Nutrient level is low, which is ideal for germination.",
            "near_max": "Nearing upper limit for germination. Watch for signs of salt stress."
            },
            "ec": {
            "below_min": "EC low (OK for sprouting). Introduce 1/4 strength solution (e.g., 0.8-1.0 mS/cm) after cotyledons appear.",
            "above_max": "Too high! High EC can dehydrate and burn new roots. Dilute reservoir immediately.",
            "near_min": "EC is low, which is ideal for germination.",
            "near_max": "Nearing upper limit for germination. Monitor closely."
            },
            "light": {
            "below_min": "Add supplemental light or reduce canopy shading.",
            "above_max": "Too intense light can cause tip burn; raise fixture or diffuse.",
            "near_min": "Consider extending photoperiod if growth slows.",
            "near_max": "Watch for leaf edge curl — may need to raise lights."
            },
            "environment_temp": {
            "below_min": "Cool air slows growth — ensure adequate circulation but avoid drafts.",
            "above_max": "High heat risks bolting — increase ventilation or shading.",
            "near_min": "If trend continues, pre-warm incoming air.",
            "near_max": "Improve airflow to stabilize temperature."
            },
            "water_temperature": {
            "below_min": "Cold solution slows germination. Insulate reservoir or add a reservoir heater.",
            "above_max": "Warm solution (>24°C) risks root rot (Pythium). Add a water chiller or drop in frozen water bottles.",
            "near_min": "Monitor nightly lows; add insulation or heater if dropping further.",
            "near_max": "Increase aeration to add oxygen; consider adding frozen bottles to cool reservoir."
            },
            "humidity": {
            "below_min": "CRITICAL: Germination requires high RH. Add humidity dome or mist frequently.",
            "above_max": "High RH is good, but >90% can invite mold. Allow brief 'airing out' daily.",
            "near_min": "Too low for optimal germination. Add humidity dome.",
            "near_max": "Ideal humidity for sprouting."
            }
        },
        "Lettuce_Seedling": {
            "general": "Introduce a light (1/2 strength) nutrient solution to the reservoir (target 560-840 ppm). Ensure strong aeration with an air stone to promote healthy root development.",
            "ph": {
            "below_min": "Too acidic for seedlings. Raise pH in reservoir slowly to 5.5–6.0.",
            "above_max": "Too alkaline. Gently lower pH in reservoir to 5.5-6.0 range.",
            "near_min": "Trend downward? Add small pH Up dose to reservoir.",
            "near_max": "Monitor. Drifting high can limit nutrient uptake for new roots."
            },
            "tds": {
            "below_min": "Nutrients low. Add 1/2 strength nutrient mix to reservoir (target ~700 ppm).",
            "above_max": "Too high for young seedlings. Dilute reservoir with fresh pH'd water.",
            "near_min": "Plan to add a mild nutrient top-up to reservoir soon.",
            "near_max": "Nearing upper limit. Watch leaf tips for burn; top-off with plain water."
            },
            "ec": {
            "below_min": "Nutrients low. Add 1/2 strength nutrient mix to reservoir (target ~1.0 mS/cm).",
            "above_max": "Too high for young seedlings. Dilute reservoir with fresh pH'd water.",
            "near_min": "Plan to add a mild nutrient top-up to reservoir soon.",
            "near_max": "Nearing upper limit. Watch leaf tips for burn; top-off with plain water."
            },
            "light": {
            "below_min": "Seedlings stretching (leggy). Lower light fixture or increase intensity.",
            "above_max": "Too intense. Can scorch young leaves. Raise fixture or dim light.",
            "near_min": "May be too low if seedlings look pale or 'leggy'.",
            "near_max": "Good intensity. Watch for any leaf curl or bleaching."
            },
            "environment_temp": {
            "below_min": "Too cool. Target 18°C for sturdy seedling growth.",
            "above_max": "Too warm. Target 18°C. High temps can cause stretching and weak stems.",
            "near_min": "Slightly cool. Monitor closely, aim for 18°C target.",
            "near_max": "Slightly warm. Monitor closely, aim for 18°C target."
            },
            "water_temperature": {
            "below_min": "Cold roots slow nutrient uptake. Insulate reservoir or add heater.",
            "above_max": "Warm solution (>22°C) lowers dissolved O2. Add chiller or frozen bottles to reservoir.",
            "near_min": "Monitor nightly lows; insulate reservoir if dropping further.",
            "near_max": "Add more aeration to reservoir; top-off with cooler water."
            },
            "humidity": {
            "below_min": "Too dry for young seedlings. Can slow growth. Add gentle misting.",
            "above_max": "High RH + young leaves = damping-off risk. Increase airflow *gently*.",
            "near_min": "If new leaves look dry, raise RH slightly.",
            "near_max": "Ensure good airflow to prevent mildew on tender leaves."
            }
        },
        "Basil": {
            "general": "Ensure consistent pruning to encourage airflow.",
            "ph": {
                "below_min": "Low pH can mute aroma compounds — raise gradually.",
                "above_max": "High pH reduces micronutrient availability — adjust slowly.",
                "near_min": "Stabilize with small pH Up micro‑dose.",
                "near_max": "If trending higher, perform partial dilution.",
            },
            "tds": {
                "below_min": "Slight boost supports leaf mass; add balanced nutrients.",
                "above_max": "Excess salts can dull flavor — dilute 10–20%.",
                "near_min": "Consider mild feed if new growth is pale.",
                "near_max": "Maintain airflow; high EC plus heat stresses basil.",
            },
            "ec": {
                "below_min": "Slight boost supports leaf mass; add balanced nutrients.",
                "above_max": "Excess salts can dull flavor — dilute 10–20%.",
                "near_min": "Consider mild feed if new growth is pale.",
                "near_max": "Maintain airflow; high EC plus heat stresses basil.",
            },
            "light": {
                "below_min": "Increase PPFD for compact, aromatic growth.",
                "above_max": "Too much light may cause chlorosis — raise fixture.",
                "near_min": "Extend photoperiod a little for fuller canopy.",
                "near_max": "Watch for leaf curl; diffuse if necessary.",
            },
            "environment_temp": {
                "below_min": "Basil slows < optimal temp — avoid cold drafts.",
                "above_max": "High heat + high RH invites fungus — vent promptly.",
                "near_min": "If nights are cool, buffer with thermal mass.",
                "near_max": "Improve evaporative cooling or shading.",
            },
            "water_temperature": {
                "below_min": "Cool solution reduces root vigor — gently warm.",
                "above_max": "Warm solution invites pathogen pressure — cool it.",
                "near_min": "Insulate lines if chill is recurring.",
                "near_max": "Increase aeration to maintain oxygen.",
            },
            "humidity": {
                "below_min": "Low RH can stunt tender tips — raise slightly.",
                "above_max": "Prone to downy mildew — dehumidify now.",
                "near_min": "Monitor leaf edge dry‑out.",
                "near_max": "Ensure canopy dries before dark.",
            },
        },
        "Basil_Germination": {
            "general": "Fill reservoir with clean, pH-balanced water (5.5-6.0). Use a reservoir heater if needed to maintain a warm solution (21-26°C), which is critical for basil germination.",
            "ph": {
            "below_min": "Too acidic for germination. Raise pH in reservoir slowly; aim 5.5–6.0.",
            "above_max": "Too alkaline. Gently lower pH in reservoir to 5.5-6.0 range.",
            "near_min": "Stabilize with small pH Up micro-dose in reservoir.",
            "near_max": "Monitor. Drifting high can affect initial root nutrient uptake."
            },
            "tds": {
            "below_min": "Nutrient level is low, which is ideal for germination. Use plain pH'd water in reservoir.",
            "above_max": "Too high! High salts can stop basil seeds from sprouting. Flush reservoir and refill with plain water.",
            "near_min": "Ideal for germination.",
            "near_max": "Nearing upper limit for germination. Dilute reservoir solution."
            },
            "ec": {
            "below_min": "EC is low, which is ideal for germination. Use plain pH'd water in reservoir.",
            "above_max": "Too high! High EC can stop basil seeds from sprouting. Flush reservoir and refill with plain water.",
            "near_min": "Ideal for germination.",
            "near_max": "Nearing upper limit for germination. Dilute reservoir solution."
            },
            "light": {
            "below_min": "Basil needs light to germinate. Ensure fixture is on.",
            "above_max": "Too intense. Can dry out plugs quickly. Raise light.",
            "near_min": "At the low end. Fine for sprouting.",
            "near_max": "Good level. Ensure medium stays moist."
            },
            "environment_temp": {
            "below_min": "CRITICAL: Basil needs heat (24°C+) to sprout. Use heat mat or raise room temp.",
            "above_max": "Too hot. Can dry out plugs. Add gentle ventilation.",
            "near_min": "Too cool for basil. Sprouting will be slow/fail. Add heat.",
            "near_max": "Ideal warmth. Ensure high humidity."
            },
            "water_temperature": {
            "below_min": "Solution is too cold for basil germination. Add a reservoir heater.",
            "above_max": "Warm solution is good for sprouting, but >26°C risks pathogens. Add aeration to reservoir.",
            "near_min": "A bit cool. Add a reservoir heater or insulate reservoir.",
            "near_max": "Good temperature. Ensure solution is aerated."
            },
            "humidity": {
            "below_min": "CRITICAL: Germination requires high RH. Add humidity dome.",
            "above_max": "High RH is good, but >90% can invite mold. Allow brief 'airing out' daily.",
            "near_min": "Too low for optimal germination. Add humidity dome.",
            "near_max": "Ideal humidity for sprouting."
            }
        },
        "Basil_Seedling": {
            "general": "Introduce a light (1/2 strength) nutrient solution to the reservoir (target 350-700 ppm). Keep the solution warm (21-25°C) and well-aerated to support vigorous root growth.",
            "ph": {
            "below_min": "Low pH can mute aroma. Raise reservoir pH gradually to 5.5-6.0.",
            "above_max": "High pH reduces micronutrient availability. Adjust reservoir pH slowly.",
            "near_min": "Stabilize with small pH Up micro-dose in reservoir.",
            "near_max": "If trending higher, perform partial dilution of reservoir."
            },
            "tds": {
            "below_min": "Nutrients low. Add 1/2 strength nutrient mix to reservoir (target ~500-700 ppm).",
            "above_max": "Too strong for young basil. Dilute reservoir solution with fresh pH'd water.",
            "near_min": "Consider adding a mild nutrient feed to reservoir if new growth is pale.",
            "near_max": "Nearing upper limit. Watch leaf tips for burn; top-off with plain water."
            },
            "ec": {
            "below_min": "Nutrients low. Add 1/2 strength nutrient mix to reservoir (target ~0.8-1.0 mS/cm).",
            "above_max": "Too strong for young basil. Dilute reservoir solution with fresh pH'd water.",
            "near_min": "Consider adding a mild nutrient feed to reservoir if new growth is pale.",
            "near_max": "Nearing upper limit. Watch leaf tips for burn; top-off with plain water."
            },
            "light": {
            "below_min": "Seedlings are leggy! Lower light fixture or increase intensity NOW.",
            "above_max": "Too intense. Can scorch young leaves. Raise fixture.",
            "near_min": "May be too low if seedlings look 'leggy'.",
            "near_max": "Good intensity. Watch for any leaf curl or bleaching."
            },
            "environment_temp": {
            "below_min": "Basil seedlings slow down < 21°C. Avoid cold drafts.",
            "above_max": "High heat + humidity risks fungus. Vent promptly.",
            "near_min": "A bit cool. Aim for 21-25°C range.",
            "near_max": "Ideal warmth. Ensure good airflow."
            },
            "water_temperature": {
            "below_min": "Cool solution reduces root vigor. Add a reservoir heater to aim for 21°C+.",
            "above_max": "Warm solution invites pathogen pressure. Add a water chiller or frozen bottles.",
            "near_min": "Insulate reservoir if chill is recurring.",
            "near_max": "Increase aeration in reservoir to maintain oxygen."
            },
            "humidity": {
            "below_min": "Low RH can stunt tender tips. Raise slightly.",
            "above_max": "High RH risks damping-off. Increase airflow.",
            "near_min": "Monitor leaf edge dry-out.",
            "near_max": "Ensure canopy dries before dark."
            }
        },
        "Pechay": {
            "general": "Keep solution fresh; steady feed and airflow help tight heads.",
            "ph": {
                "below_min": "Raise toward mid‑6s slowly to maintain nutrient availability.",
                "above_max": "High pH limits Ca uptake — lower by ~0.2 and re‑test.",
                "near_min": "Trend down? Add a small pH Up dose and monitor.",
                "near_max": "If drifting up, plan a gentle pH Down correction.",
            },
            "tds": {
                "below_min": "Increase EC gradually; watch for pale leaves or slowed growth.",
                "above_max": "Dilute to prevent bitterness and tip burn; target mid‑range.",
                "near_min": "Schedule a modest nutrient top‑up soon.",
                "near_max": "If edges curl or tips brown, dilute slightly.",
            },
            "ec": {
                "below_min": "Increase EC in small steps (≈0.2–0.3 mS/cm) and re‑test.",
                "above_max": "Dilute to avoid salt stress; aim for mid‑range.",
                "near_min": "Plan a mild feed to avoid slowdown.",
                "near_max": "Monitor for burn; slight dilution may help.",
            },
            "light": {
                "below_min": "Provide bright, even light; reduce canopy shading.",
                "above_max": "Diffuse or raise fixture to avoid leaf scorch.",
                "near_min": "Extend photoperiod slightly if growth is leggy.",
                "near_max": "Watch for curling — raise or dim lights if needed.",
            },
            "environment_temp": {
                "below_min": "Cool air slows head formation — reduce drafts and heat gently.",
                "above_max": "Heat can cause bolting — improve ventilation or shading.",
                "near_min": "If trend continues, buffer nights with thermal mass.",
                "near_max": "Enhance airflow to stabilize temperature.",
            },
            "water_temperature": {
                "below_min": "Gently warm solution; cold roots slow uptake.",
                "above_max": "Cool solution to maintain oxygen; consider partial swap.",
                "near_min": "Insulate reservoir if nightly lows persist.",
                "near_max": "Increase aeration or add cooler top‑up water.",
            },
            "humidity": {
                "below_min": "Raise RH modestly (misters/trays) to reduce stress.",
                "above_max": "Increase airflow; brassicas are mildew‑prone.",
                "near_min": "Monitor midday wilt; bump RH slightly if needed.",
                "near_max": "Ensure leaves dry before dark to prevent disease.",
            },
        },

        "Generic": {
            "general": "Keep conditions stable; adjust in small steps and re‑test.",
            "ph": {
                "below_min": "Raise pH gradually toward mid‑range; mix and re‑check.",
                "above_max": "Lower pH slowly (~0.2 steps) to restore availability.",
                "near_min": "Monitor trend; a small pH Up correction may help.",
                "near_max": "Monitor and plan a gentle pH Down if rising further.",
            },
            "tds": {
                "below_min": "Increase nutrient concentration gradually; observe new growth.",
                "above_max": "Dilute or partial drain/refill to reduce salt stress.",
                "near_min": "Plan a mild top‑up soon.",
                "near_max": "Consider slight dilution if burn symptoms appear.",
            },
            "ec": {
                "below_min": "Increase EC in small increments and re‑test.",
                "above_max": "Dilute to mid‑range to avoid lockout.",
                "near_min": "Monitor; mild feed if trend continues down.",
                "near_max": "Monitor; slight dilution if trend continues up.",
            },
            "light": {
                "below_min": "Add light or reduce shading to maintain vigor.",
                "above_max": "Raise/diffuse fixture to reduce stress.",
                "near_min": "Extend photoperiod slightly if growth slows.",
                "near_max": "Watch for edge curl or bleaching; back off intensity.",
            },
            "environment_temp": {
                "below_min": "Gently warm space and cut drafts to avoid slowdown.",
                "above_max": "Improve cooling/ventilation to prevent heat stress.",
                "near_min": "Stabilize nights; monitor trend.",
                "near_max": "Increase airflow to hold temp in range.",
            },
            "water_temperature": {
                "below_min": "Insulate or gently warm reservoir; cold reduces uptake.",
                "above_max": "Cool solution and boost aeration to maintain oxygen.",
                "near_min": "Monitor lows; prepare heating if needed.",
                "near_max": "Consider partial swap with cooler water; aerate more.",
            },
            "humidity": {
                "below_min": "Raise RH slightly to reduce transpiration stress.",
                "above_max": "Dehumidify or increase airflow to prevent mildew.",
                "near_min": "Monitor leaf edges; increase RH a bit if drying.",
                "near_max": "Ensure canopy dries before lights‑off.",
            },
        },
        "Pechay_Germination": {
            "general": "Fill reservoir with clean, pH-balanced water (6.0-7.0). Ensure solution is stable (18-22°C) and well-aerated to provide a good base for fast-sprouting seeds.",
            "ph": {
            "below_min": "Too acidic for Pechay. Raise reservoir pH to 6.0-7.0 range.",
            "above_max": "Too alkaline. Gently lower reservoir pH to 6.0-7.0 range.",
            "near_min": "Trend down? Add a small pH Up dose to reservoir and monitor.",
            "near_max": "If drifting up, plan a gentle pH Down correction in reservoir."
            },
            "tds": {
            "below_min": "Nutrient level is low, which is ideal for germination. Use plain pH'd water or 1/4 strength in reservoir.",
            "above_max": "Too high! High salts can burn new roots. Dilute reservoir with plain pH'd water.",
            "near_min": "Ideal for germination.",
            "near_max": "Nearing upper limit for germination. Dilute reservoir solution."
            },
            "ec": {
            "below_min": "EC is low, which is ideal for germination. Use plain pH'd water or 1/4 strength in reservoir.",
            "above_max": "Too high! High EC can burn new roots. Dilute reservoir with plain pH'd water.",
            "near_min": "Ideal for germination.",
            "near_max": "Nearing upper limit for germination. Dilute reservoir solution."
            },
            "light": {
            "below_min": "Pechay needs light to sprout. Ensure fixture is on.",
            "above_max": "Too intense. Can dry out plugs quickly. Raise light.",
            "near_min": "At the low end. Fine for sprouting.",
            "near_max": "Good level. Ensure medium stays moist."
            },
            "environment_temp": {
            "below_min": "Too cool. Germination will be slow. Raise temp to 21-24°C range.",
            "above_max": "Too warm. Can dry out plugs. Increase ventilation.",
            "near_min": "A bit cool. Monitor; raise temp slightly if sprouting is slow.",
            "near_max": "Ideal warmth. Ensure high humidity."
            },
            "water_temperature": {
            "below_min": "Cold solution slows germination. Insulate reservoir or add a reservoir heater.",
            "above_max": "Warm solution (>22°C) risks root rot. Add a water chiller or frozen bottles to reservoir.",
            "near_min": "Monitor nightly lows; insulate reservoir if dropping further.",
            "near_max": "Aerate reservoir more or partially replace with cooler water."
            },
            "humidity": {
            "below_min": "CRITICAL: Germination requires high RH. Add humidity dome or mist frequently.",
            "above_max": "High RH is good, but >90% can invite mold. Allow brief 'airing out' daily.",
            "near_min": "Too low for optimal germination. Add humidity dome.",
            "near_max": "Ideal humidity for sprouting."
            }
        },
        "Pechay_Seedling": {
            "general": "Introduce a 1/2 to 3/4 strength nutrient solution to the reservoir (target 700-900 ppm). Pechay roots prefer cooler water (18-22°C); keep solution well-aerated.",
            "ph": {
            "below_min": "Too acidic. Raise reservoir pH to 6.0-7.0 range for seedling uptake.",
            "above_max": "Too alkaline. Lower reservoir pH gently to 6.0-7.0 range.",
            "near_min": "Trend down? Add a small pH Up dose to reservoir and monitor.",
            "near_max": "If drifting up, plan a gentle pH Down correction in reservoir."
            },
            "tds": {
            "below_min": "Nutrients low. Add 1/2 to 3/4 strength nutrient mix to reservoir (target 700-900 ppm).",
            "above_max": "Too high for young seedlings. Dilute reservoir solution with fresh pH'd water.",
            "near_min": "Plan to add a mild nutrient top-up to reservoir soon.",
            "near_max": "Nearing upper limit. Watch leaf tips for burn; top-off with plain water."
            },
            "ec": {
            "below_min": "Nutrients low. Add 1/2 to 3/4 strength nutrient mix to reservoir (target 1.0-1.2 mS/cm).",
            "above_max": "Too high for young seedlings. Dilute reservoir solution with fresh pH'd water.",
            "near_min": "Plan to add a mild nutrient top-up to reservoir soon.",
            "near_max": "Nearing upper limit. Watch leaf tips for burn; top-off with plain water."
            },
            "light": {
            "below_min": "Seedlings stretching (leggy). Lower light fixture or increase intensity.",
            "above_max": "Too intense. Can scorch young leaves. Raise fixture or dim light.",
            "near_min": "May be too low if seedlings look pale or 'leggy'.",
            "near_max": "Good intensity. Watch for any leaf curl or bleaching."
            },
            "environment_temp": {
            "below_min": "Too cold for Pechay seedlings. Aim for 15.5-18°C range.",
            "above_max": "Too warm. Pechay prefers cool temps. Lower temp to prevent stretching.",
            "near_min": "At the low end. Monitor growth.",
            "near_max": "At the high end. Increase airflow."
            },
            "water_temperature": {
            "below_min": "Cold roots slow nutrient uptake. Insulate reservoir or add a small heater.",
            "above_max": "Warm solution (>22°C) lowers dissolved O2. Add a chiller or frozen bottles to reservoir.",
            "near_min": "Monitor nightly lows; insulate reservoir if dropping further.",
            "near_max": "Add more aeration to reservoir; top-off with cooler water."
            },
            "humidity": {
            "below_min": "Too dry for young seedlings. Can slow growth. Add gentle misting.",
            "above_max": "High RH + young leaves = fungal risk. Increase airflow.",
            "near_min": "If new leaves look dry, raise RH slightly.",
            "near_max": "Ensure good airflow to prevent mildew on tender leaves."
            },
        },
    }

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
        # Get user object from email (optimized lookup)
        try:
            user = User.objects.only('id', 'email').get(email=user_email)
        except User.DoesNotExist:
            logger.warning(f"User with email {user_email} not found for device {device.id}")
            return None

        # Derive plant-aware thresholds when possible
        plant_ranges = None
        reservoir = None
        try:
            if sensor_type in {"tds", "ec", "ph", "water_temperature"}:
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
                        # environment-related ranges intentionally omitted
                        "plant_name": plant.plant_name,
                        "plant_category": SensorAlertService._plant_category_for(plant.plant_name),
                    }
        except Exception:
            # Non-fatal; fall back to static thresholds
            plant_ranges = None

        alert_info = SensorAlertService._detect_alert(sensor_type, value, plant_ranges)

        if not alert_info:
            return None

        # Alert detected, send push notification
        severity = alert_info["severity"]
        title = alert_info["title"]
        body = alert_info["body"]
        metric = alert_info.get("metric") or getattr(sensor, "sensor_type", None)

        # Cooldown suppression: skip creating duplicate/lower-severity alerts within window
        try:
            if SensorAlertService._should_suppress_alert(sensor=sensor, metric=metric, current_severity=severity):
                logger.info(
                    f"Suppressing alert due to cooldown: sensor={sensor.id} metric={metric} severity={severity}"
                )
                return None
        except Exception as _cooldown_err:
            logger.error(f"Cooldown check failed; proceeding with alert creation. Error: {_cooldown_err}")

        logger.info(
            f"Alert detected: {sensor_type}={value} for device {device.id} ({device.device_name}), "
            f"severity={severity}"
        )

        # Persist alert row for UI and auditing
        try:
            from .models import Alert
            alert_obj = SensorAlertService._create_alert(
                alert_info=alert_info,
                device=device,
                sensor=sensor,
                reservoir=reservoir,
                sensor_data=sensor_data,
                plant_ranges=plant_ranges,
            )
            logger.info(f"Created Alert {alert_obj.id} for device {device.id}")
        except Exception as e:
            logger.error(f"Failed to persist Alert: {e}")

        # Broadcast alert via WebSocket to appropriate connected clients
        from channels.layers import get_channel_layer
        from asgiref.sync import async_to_sync

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

        # Create NotificationLog entry for the alert
        from apps.notifications.models import NotificationLog
        try:
            meta = {
                'device_id': device.id,
                'device_serial': device.device_serial,
                'sensor_type': sensor_type,
                'sensor_value': float(value),
                'alert_id': sensor_data.id,
            }
            # Include the persisted Alert row id when available for easier correlation/deletion later
            try:
                if 'alert_obj' in locals() and alert_obj:
                    meta['alert_row_id'] = alert_obj.id
            except Exception:
                pass

            notification_log = NotificationLog.objects.create(
                user=user,
                notification_type=severity,
                title=title,
                message=body,
                status='sent',
                metadata=meta
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
    def _should_suppress_alert(*, sensor, metric: Optional[str], current_severity: str) -> bool:
        """Return True if a recent alert should suppress creating a new one.

        Rules:
        - If an alert of the same metric for this sensor exists within the cooldown window
          and its severity is the same or higher, suppress.
        - If the new alert is higher severity than the recent one (escalation), allow.
        """
        from .models import Alert

        if not sensor or not metric:
            return False

        cooldown_minutes = int(getattr(settings, "ALERT_COOLDOWN_MINUTES", 30))
        window_start = timezone.now() - timedelta(minutes=cooldown_minutes)

        # Find the most recent alert for this sensor+metric in the cooldown window
        last_alert = (
            Alert.objects
            .filter(sensor=sensor, metric=metric, created_at__gte=window_start)
            .order_by("-created_at")
            .first()
        )
        if not last_alert:
            return False

        severity_rank = {"warning": 1, "critical": 2}
        last_rank = severity_rank.get(last_alert.severity, 0)
        curr_rank = severity_rank.get(current_severity, 0)

        # Suppress when last severity is same or higher; allow only if escalation
        return last_rank >= curr_rank

    @staticmethod
    def _plant_category_for(plant_name: Optional[str]) -> str:
        name = (plant_name or "").strip().lower()
        if name == "lettuce":
            return "Lettuce"
        if name == "basil":
            return "Basil"
        if name == "pechay":
            return "Pechay"
        return "Generic"

    @staticmethod
    def _create_alert(alert_info: dict, device, sensor, reservoir, sensor_data, plant_ranges):
        """Create an Alert row from detected info and context."""
        from .models import Alert

        # Derive trigger and thresholds from info
        trigger = alert_info.get("trigger")
        metric = alert_info.get("metric")
        severity = alert_info.get("severity")
        title = alert_info.get("title")
        recommendation = alert_info.get("recommendation") or alert_info.get("body")

        unit = getattr(sensor, "unit", "") if sensor else ""

        # Determine thresholds and buffer if available
        min_th = None
        max_th = None
        buf = None
        if plant_ranges:
            keys = {
                "tds": ("ppm_min", "ppm_max"),
                "ec": ("ec_min", "ec_max"),
                "ph": ("ph_min", "ph_max"),
                "water_temperature": ("water_temp_min", "water_temp_max"),
                "light": ("light_min", "light_max"),
                "environment_temp": ("environment_temp_min", "environment_temp_max"),
                "humidity": ("humidity_min", "humidity_max"),
            }.get(metric)
            if keys:
                min_th = float(plant_ranges.get(keys[0]))
                max_th = float(plant_ranges.get(keys[1]))
                # default 10% span buffer clamped [0.5, 200] units
                span = max(0.0, float(max_th) - float(min_th))
                raw_buf = span * 0.1
                buf = max(0.5, min(200.0, raw_buf))

        alert = Alert.objects.create(
            device=device,
            sensor=sensor,
            reservoir=reservoir,
            metric=metric or (sensor.sensor_type if sensor else ""),
            trigger=trigger or "",
            severity=severity,
            value=float(sensor_data.value),
            unit=unit,
            min_threshold=min_th,
            max_threshold=max_th,
            buffer=buf,
            plant_name=(plant_ranges or {}).get("plant_name", ""),
            plant_category=(plant_ranges or {}).get("plant_category", "Generic"),
            title=title,
            recommendation=recommendation,
            metadata={
                "reading_id": sensor_data.id,
                "sensor_type": getattr(sensor, "sensor_type", None),
            },
        )
        return alert

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
            ph_min = plant_ranges.get("ph_min") if plant_ranges else SensorAlertService.PH_MIN
            ph_max = plant_ranges.get("ph_max") if plant_ranges else SensorAlertService.PH_MAX
            span = max(0.0, float(ph_max) - float(ph_min))
            base_buf = max(0.1, span * 0.1)
            buf = min(0.4, base_buf)
            if value < ph_min:
                return SensorAlertService._build_alert("ph", "below_min", "critical", value, ph_min, ph_max, buf, plant_ranges)
            if value > ph_max:
                return SensorAlertService._build_alert("ph", "above_max", "critical", value, ph_min, ph_max, buf, plant_ranges)
            if value <= (ph_min + buf):
                return SensorAlertService._build_alert("ph", "near_min", "warning", value, ph_min, ph_max, buf, plant_ranges)
            if value >= (ph_max - buf):
                return SensorAlertService._build_alert("ph", "near_max", "warning", value, ph_min, ph_max, buf, plant_ranges)

        # TDS alerts
        elif sensor_type == "tds":
            ppm_min = plant_ranges.get("ppm_min") if plant_ranges else SensorAlertService.TDS_MIN
            ppm_max = plant_ranges.get("ppm_max") if plant_ranges else SensorAlertService.TDS_MAX
            span = max(0.0, float(ppm_max) - float(ppm_min))
            base_buf = span * 0.1
            buf = max(50.0, min(200.0, base_buf))
            if value < ppm_min:
                return SensorAlertService._build_alert("tds", "below_min", "critical", value, ppm_min, ppm_max, buf, plant_ranges)
            if value <= (ppm_min + buf):
                return SensorAlertService._build_alert("tds", "near_min", "warning", value, ppm_min, ppm_max, buf, plant_ranges)
            if value > ppm_max:
                return SensorAlertService._build_alert("tds", "above_max", "critical", value, ppm_min, ppm_max, buf, plant_ranges)
            if value >= (ppm_max - buf):
                return SensorAlertService._build_alert("tds", "near_max", "warning", value, ppm_min, ppm_max, buf, plant_ranges)

        # Water level alerts (not plant-specific)
        elif sensor_type == "water_level":
            if value == SensorAlertService.WATER_LEVEL_CRITICAL:
                return {"severity": "critical", "title": "Water Level Empty", "body": ("Water level is 0% — reservoir empty. Refill with fresh nutrient solution immediately, check pumps for priming issues, and inspect for leaks.")}
            if value <= SensorAlertService.WATER_LEVEL_WARNING:
                return {"severity": "warning", "title": "Low Water Level", "body": (f"Water level is {value:.0f}% (below {SensorAlertService.WATER_LEVEL_WARNING}%). Refill soon and verify auto-refill settings or inspect for slow leaks.")}

        # Air/environment temperature alerts removed

        # Turbidity alerts
        elif sensor_type == "turbidity":
            # value is NTU (0..1000)
            if value < SensorAlertService.TURBIDITY_CLEAR_NTU:
                return None
            if value < SensorAlertService.TURBIDITY_CLOUDY_NTU:
                return {"severity": "warning", "title": "Water Cloudy", "body": (f"Turbidity is {value:.0f} NTU (cloudy range). Clean filters and consider partial water change.")}
            return {"severity": "critical", "title": "Water Turbid", "body": (f"Turbidity is {value:.0f} NTU (turbid). Drain/refill, clean filters and tubing.")}

        # Light alerts removed

        # Water temperature alerts (plant-specific)
        elif sensor_type == "water_temperature":
            if plant_ranges:
                wmin = plant_ranges.get("water_temp_min")
                wmax = plant_ranges.get("water_temp_max")
                span = max(0.0, float(wmax) - float(wmin))
                buf = max(0.2, min(1.0, span * 0.1))
                if value < wmin:
                    return SensorAlertService._build_alert("water_temperature", "below_min", "warning", value, wmin, wmax, buf, plant_ranges)
                if value <= (wmin + buf):
                    return SensorAlertService._build_alert("water_temperature", "near_min", "warning", value, wmin, wmax, buf, plant_ranges)
                if value > wmax:
                    return SensorAlertService._build_alert("water_temperature", "above_max", "warning", value, wmin, wmax, buf, plant_ranges)
                if value >= (wmax - buf):
                    return SensorAlertService._build_alert("water_temperature", "near_max", "warning", value, wmin, wmax, buf, plant_ranges)

        # EC alerts (plant-specific)
        elif sensor_type == "ec":
            if plant_ranges:
                emin = plant_ranges.get("ec_min")
                emax = plant_ranges.get("ec_max")
                span = max(0.0, float(emax) - float(emin))
                buf = max(0.05, min(0.5, span * 0.1))
                if value < emin:
                    return SensorAlertService._build_alert("ec", "below_min", "critical", value, emin, emax, buf, plant_ranges)
                if value <= (emin + buf):
                    return SensorAlertService._build_alert("ec", "near_min", "warning", value, emin, emax, buf, plant_ranges)
                if value > emax:
                    return SensorAlertService._build_alert("ec", "above_max", "critical", value, emin, emax, buf, plant_ranges)
                if value >= (emax - buf):
                    return SensorAlertService._build_alert("ec", "near_max", "warning", value, emin, emax, buf, plant_ranges)

        # Humidity alerts removed

        return None

    @staticmethod
    def _build_alert(
        metric: str,
        trigger: str,
        severity: str,
        value: float,
        min_th: float,
        max_th: float,
        buf: float,
        plant_ranges: Optional[dict],
    ) -> dict:
        """Build alert dict with plant-specific recommendation messaging."""
        plant_name = (plant_ranges or {}).get("plant_name")
        plant_category = (plant_ranges or {}).get("plant_category", "Generic")
        tpl = SensorAlertService.PLANT_RECOMMENDATION_TEMPLATES.get(plant_category, {}).get(metric, {})
        rec = tpl.get(trigger)
        if not rec:
            # fallback to generic metric template
            tpl = SensorAlertService.PLANT_RECOMMENDATION_TEMPLATES.get("Generic", {}).get(metric, {})
            rec = tpl.get(trigger, "Keep conditions stable; adjust gradually and re-check.")

        title_map = {
            ("ph", "below_min"): "Low pH Detected",
            ("ph", "above_max"): "High pH Detected",
            ("ph", "near_min"): "pH Near Lower Limit",
            ("ph", "near_max"): "pH Near Upper Limit",
            ("tds", "below_min"): "TDS Below Optimal Range",
            ("tds", "above_max"): "TDS Above Optimal Range",
            ("tds", "near_min"): "TDS Near Lower Limit",
            ("tds", "near_max"): "TDS Near Upper Limit",
            ("ec", "below_min"): "EC Below Optimal Range",
            ("ec", "above_max"): "EC Above Optimal Range",
            ("ec", "near_min"): "EC Near Lower Limit",
            ("ec", "near_max"): "EC Near Upper Limit",
            ("water_temperature", "below_min"): "Low Water Temperature",
            ("water_temperature", "above_max"): "High Water Temperature",
            ("water_temperature", "near_min"): "Water Temp Near Lower Limit",
            ("water_temperature", "near_max"): "Water Temp Near Upper Limit",
        }

        # Human body text include ranges
        rng = f" ({min_th:.1f}–{max_th:.1f})" if min_th is not None and max_th is not None else ""
        plant_suffix = f" for {plant_name}" if plant_name else ""

        body = None
        unit = {
            "ph": "",
            "tds": " ppm",
            "ec": " mS/cm",
            "water_temperature": " °C",
        }.get(metric, "")

        if metric in ("ph", "tds", "ec", "water_temperature"):
            body = (
                f"{metric.upper()} is {value:.1f}{unit} (trigger: {trigger}{rng}{plant_suffix}). "
                f"{rec}"
            )

        return {
            "severity": severity,
            "title": title_map.get((metric, trigger), f"{metric.upper()} Alert"),
            "body": body or rec,
            "metric": metric,
            "trigger": trigger,
            "recommendation": rec,
        }
