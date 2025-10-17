// Shared plant-aware alert utilities and templates

// Proximity buffer defaults (ppm for TDS, analogous for other ranges)
export const DEFAULT_PROXIMITY_MIN = 50;
export const DEFAULT_PROXIMITY_MAX = 200;

export function computeProximityBuffer(min, max) {
    if (!Number.isFinite(min) || !Number.isFinite(max)) {
        return { low: DEFAULT_PROXIMITY_MIN, high: DEFAULT_PROXIMITY_MIN };
    }
    const span = Math.max(0, max - min);
    const base = span * 0.1; // 10%
    const buf = Math.min(DEFAULT_PROXIMITY_MAX, Math.max(DEFAULT_PROXIMITY_MIN, base));
    return { low: buf, high: buf };
}

export function classifyValue(value, min, max) {
    if (!Number.isFinite(value) || !Number.isFinite(min) || !Number.isFinite(max)) {
        return { severity: 'none', reason: null };
    }
    const { low: proxLow, high: proxHigh } = computeProximityBuffer(min, max);
    if (value < min) return { severity: 'critical', reason: 'below_min', proxLow, proxHigh };
    if (value > max) return { severity: 'critical', reason: 'above_max', proxLow, proxHigh };
    if (value <= min + proxLow) return { severity: 'warning', reason: 'near_min', proxLow, proxHigh };
    if (value >= max - proxHigh) return { severity: 'warning', reason: 'near_max', proxLow, proxHigh };
    return { severity: 'none', reason: null, proxLow, proxHigh };
}

// Domain-specific classifiers (plant aware)
export const classifyPH = (v, plant) => plant ? classifyValue(Number(v), plant.ph_min, plant.ph_max) : { severity: 'none' };
export const classifyTDS = (v, plant) => plant ? classifyValue(Number(v), plant.ppm_min, plant.ppm_max) : { severity: 'none' };
export const classifyEC = (v, plant) => plant ? classifyValue(Number(v), plant.ec_min, plant.ec_max) : { severity: 'none' };
export const classifyEnvTemp = (v, plant) => plant ? classifyValue(Number(v), plant.environment_temp_min, plant.environment_temp_max) : { severity: 'none' };
export const classifyHumidity = (v, plant) => plant ? classifyValue(Number(v), plant.humidity_min, plant.humidity_max) : { severity: 'none' };
export const classifyLight = (v, plant) => plant ? classifyValue(Number(v), plant.light_min, plant.light_max) : { severity: 'none' };
export const classifyWaterTemp = (v, plant) => plant ? classifyValue(Number(v), plant.water_temp_min, plant.water_temp_max) : { severity: 'none' };

// Plant-specific recommendation templates (copied from AlertsPage)
export const PLANT_RECOMMENDATION_TEMPLATES = {
    Lettuce: {
        general: 'Keep roots cool and solution well oxygenated.',
        ph: {
            below_min: 'Raise slowly to avoid nutrient lockout; aim 5.8–6.2.',
            above_max: 'Slightly high pH can reduce iron uptake; adjust 0.2 at a time.',
            near_min: 'Trend downward? Buffer with small pH Up dose.',
            near_max: 'Monitor — drifting high may cause tip burn risk.'
        },
        tds: {
            below_min: 'Increase EC gradually (no more than +100 ppm per adjustment).',
            above_max: 'Dilute to avoid bitterness; target mid‑range.',
            near_min: 'Plan a mild nutrient top-up soon.',
            near_max: 'If leaves pale or edges curl, dilute slightly.'
        },
        ec: {
            below_min: 'Increase EC gradually (0.2-0.3 mS/cm per adjustment).',
            above_max: 'Dilute to avoid nutrient lockout; target mid‑range.',
            near_min: 'Plan a mild nutrient top-up soon.',
            near_max: 'Monitor for signs of nutrient burn.'
        },
        light: {
            below_min: 'Add supplemental light or reduce canopy shading.',
            above_max: 'Too intense light can cause tip burn; raise fixture or diffuse.',
            near_min: 'Consider extending photoperiod if growth slows.',
            near_max: 'Watch for leaf edge curl — may need to raise lights.'
        },
        environment_temp: {
            below_min: 'Cool air slows growth — ensure adequate circulation but avoid drafts.',
            above_max: 'High heat risks bolting — increase ventilation or shading.',
            near_min: 'If trend continues, pre‑warm incoming air.',
            near_max: 'Improve airflow to stabilize temperature.'
        },
        water_temperature: {
            below_min: 'Cold roots slow nutrient uptake — insulate reservoir.',
            above_max: 'Warm solution lowers dissolved oxygen; consider chilling.',
            near_min: 'Monitor nightly lows; add insulation if dropping further.',
            near_max: 'Aerate more or partially replace with cooler water.'
        },
        humidity: {
            below_min: 'Low RH increases transpiration — add gentle misting.',
            above_max: 'High RH risks mildew — add airflow / dehumidify.',
            near_min: 'If leaves wilt mid‑day, raise RH slightly.',
            near_max: 'Ensure leaves dry before dark period.'
        }
    },
    Basil: {
        general: 'Ensure consistent pruning to encourage airflow.',
        ph: {
            below_min: 'Low pH can mute aroma compounds — raise gradually.',
            above_max: 'High pH reduces micronutrient availability — adjust slowly.',
            near_min: 'Stabilize with small pH Up micro‑dose.',
            near_max: 'If trending higher, perform partial dilution.'
        },
        tds: {
            below_min: 'Slight boost supports leaf mass; add balanced nutrients.',
            above_max: 'Excess salts can dull flavor — dilute 10–20%.',
            near_min: 'Consider mild feed if new growth is pale.',
            near_max: 'Maintain airflow; high EC plus heat stresses basil.'
        },
        ec: {
            below_min: 'Slight boost supports leaf mass; add balanced nutrients.',
            above_max: 'Excess salts can dull flavor — dilute 10–20%.',
            near_min: 'Consider mild feed if new growth is pale.',
            near_max: 'Maintain airflow; high EC plus heat stresses basil.'
        },
        light: {
            below_min: 'Increase PPFD for compact, aromatic growth.',
            above_max: 'Too much light may cause chlorosis — raise fixture.',
            near_min: 'Extend photoperiod a little for fuller canopy.',
            near_max: 'Watch for leaf curl; diffuse if necessary.'
        },
        environment_temp: {
            below_min: 'Basil slows < optimal temp — avoid cold drafts.',
            above_max: 'High heat + high RH invites fungus — vent promptly.',
            near_min: 'If nights are cool, buffer with thermal mass.',
            near_max: 'Improve evaporative cooling or shading.'
        },
        water_temperature: {
            below_min: 'Cool solution reduces root vigor — gently warm.',
            above_max: 'Warm solution invites pathogen pressure — cool it.',
            near_min: 'Insulate lines if chill is recurring.',
            near_max: 'Increase aeration to maintain oxygen.'
        },
        humidity: {
            below_min: 'Low RH can stunt tender tips — raise slightly.',
            above_max: 'Prone to downy mildew — dehumidify now.',
            near_min: 'Monitor leaf edge dry‑out.',
            near_max: 'Ensure canopy dries before dark.'
        }
    }
};

export function enrichAlertMessage(plantInfo, sensorType, classificationReason, baseMessage) {
    if (!plantInfo) return baseMessage;
    const name = plantInfo.plant_name;
    const tips = PLANT_RECOMMENDATION_TEMPLATES[name];
    if (!tips) return baseMessage;
    const domainMap = {
        ph: 'ph',
        tds: 'tds',
        ec: 'ec',
        light: 'light',
        humidity: 'humidity',
        air_temperature: 'environment_temp',
        water_temperature: 'water_temperature'
    };
    const domain = domainMap[sensorType];
    let extra = '';
    if (domain && tips[domain]) {
        const map = tips[domain];
        if (classificationReason && map[classificationReason]) extra = map[classificationReason];
    }
    if (!extra && tips.general) extra = tips.general;
    if (!extra) return baseMessage;
    return `${baseMessage} Recommendation: ${extra}`;
}

// Build a single best alert message for dashboard based on sensors + plant
export function generatePlantAwareAlertText(sensors, plant) {
    if (!sensors) return 'All systems normal';

    const candidates = [];

    const push = (severity, priority, message) => {
        if (!message) return;
        candidates.push({ severity, priority, message });
    };

    // Water level (plant independent)
    if (typeof sensors.waterLevel === 'number') {
        const v = Number(sensors.waterLevel);
        if (v === 0) push('critical', 1, 'Water Level Empty: Reservoir empty — refill immediately and check pumps');
        else if (v <= 40) push('warning', 10, `Low Water Level: ${Math.round(v)}% (below 40%). Refill soon and verify auto-refill`);
    }

    // pH
    if (typeof sensors.ph === 'number' && plant) {
        const v = Number(sensors.ph);
        const cls = classifyPH(v, plant);
        if (cls.severity !== 'none') {
            const base = cls.reason === 'below_min'
                ? `Low pH Detected: ${v.toFixed(1)} (below ${Number(plant.ph_min).toFixed(1)}).`
                : cls.reason === 'above_max'
                    ? `High pH Detected: ${v.toFixed(1)} (above ${Number(plant.ph_max).toFixed(1)}).`
                    : cls.reason === 'near_min'
                        ? `pH ${v.toFixed(1)} approaching lower bound (${Number(plant.ph_min).toFixed(1)}).`
                        : `pH ${v.toFixed(1)} approaching upper bound (${Number(plant.ph_max).toFixed(1)}).`;
            push(cls.severity, 3, enrichAlertMessage(plant, 'ph', cls.reason, base));
        }
    }

    // TDS
    if (typeof sensors.tds === 'number' && plant) {
        const v = Number(sensors.tds);
        const cls = classifyTDS(v, plant);
        if (cls.severity !== 'none') {
            const base = cls.reason === 'below_min'
                ? `TDS below optimal range: ${v.toFixed(0)} ppm (< ${Number(plant.ppm_min).toFixed(0)} ppm).`
                : cls.reason === 'above_max'
                    ? `TDS above optimal range: ${v.toFixed(0)} ppm (> ${Number(plant.ppm_max).toFixed(0)} ppm).`
                    : cls.reason === 'near_min'
                        ? `TDS ${v.toFixed(0)} ppm near lower bound (${Number(plant.ppm_min).toFixed(0)}).`
                        : `TDS ${v.toFixed(0)} ppm near upper bound (${Number(plant.ppm_max).toFixed(0)}).`;
            push(cls.severity, 2, enrichAlertMessage(plant, 'tds', cls.reason, base));
        }
    }

    // EC
    if (typeof sensors.ec === 'number' && plant) {
        const v = Number(sensors.ec);
        const cls = classifyEC(v, plant);
        if (cls.severity !== 'none') {
            const base = cls.reason === 'below_min'
                ? `EC below optimal range: ${v.toFixed(1)} mS/cm (< ${Number(plant.ec_min).toFixed(1)}).`
                : cls.reason === 'above_max'
                    ? `EC above optimal range: ${v.toFixed(1)} mS/cm (> ${Number(plant.ec_max).toFixed(1)}).`
                    : cls.reason === 'near_min'
                        ? `EC ${v.toFixed(1)} mS/cm near lower bound (${Number(plant.ec_min).toFixed(1)}).`
                        : `EC ${v.toFixed(1)} mS/cm near upper bound (${Number(plant.ec_max).toFixed(1)}).`;
            push(cls.severity, 4, enrichAlertMessage(plant, 'ec', cls.reason, base));
        }
    }

    // Light
    if (typeof sensors.light === 'number' && plant) {
        const v = Number(sensors.light);
        const cls = classifyLight(v, plant);
        if (cls.severity !== 'none') {
            const base = cls.reason === 'below_min'
                ? `Low Light: ${Math.round(v)} lux (< ${Number(plant.light_min).toFixed(0)}).`
                : cls.reason === 'above_max'
                    ? `Very Bright Light: ${Math.round(v)} lux (> ${Number(plant.light_max).toFixed(0)}).`
                    : cls.reason === 'near_min'
                        ? `Light ${Math.round(v)} lux near lower bound (${Number(plant.light_min).toFixed(0)}).`
                        : `Light ${Math.round(v)} lux near upper bound (${Number(plant.light_max).toFixed(0)}).`;
            push(cls.severity, 8, enrichAlertMessage(plant, 'light', cls.reason, base));
        }
    }

    // Humidity
    if (typeof sensors.humidity === 'number' && plant) {
        const v = Number(sensors.humidity);
        const cls = classifyHumidity(v, plant);
        if (cls.severity !== 'none') {
            const base = cls.reason === 'below_min'
                ? `Low Humidity: ${Math.round(v)}% (< ${Number(plant.humidity_min).toFixed(0)}%).`
                : cls.reason === 'above_max'
                    ? `High Humidity: ${Math.round(v)}% (> ${Number(plant.humidity_max).toFixed(0)}%).`
                    : cls.reason === 'near_min'
                        ? `Humidity ${Math.round(v)}% near lower bound (${Number(plant.humidity_min).toFixed(0)}%).`
                        : `Humidity ${Math.round(v)}% near upper bound (${Number(plant.humidity_max).toFixed(0)}%).`;
            push(cls.severity, 7, enrichAlertMessage(plant, 'humidity', cls.reason, base));
        }
    }

    // Air temperature
    if (typeof sensors.temperature === 'number' && plant) {
        const v = Number(sensors.temperature);
        const cls = classifyEnvTemp(v, plant);
        if (cls.severity !== 'none') {
            const base = cls.reason === 'below_min'
                ? `Low Air Temperature: ${v.toFixed(1)}°C (< ${Number(plant.environment_temp_min).toFixed(1)}°C).`
                : cls.reason === 'above_max'
                    ? `High Air Temperature: ${v.toFixed(1)}°C (> ${Number(plant.environment_temp_max).toFixed(1)}°C).`
                    : cls.reason === 'near_min'
                        ? `Air temp ${v.toFixed(1)}°C near lower bound (${Number(plant.environment_temp_min).toFixed(1)}°C).`
                        : `Air temp ${v.toFixed(1)}°C near upper bound (${Number(plant.environment_temp_max).toFixed(1)}°C).`;
            push(cls.severity, 6, enrichAlertMessage(plant, 'air_temperature', cls.reason, base));
        }
    }

    // Water temperature
    if (typeof sensors.waterTemperature === 'number' && plant) {
        const v = Number(sensors.waterTemperature);
        const cls = classifyWaterTemp(v, plant);
        if (cls.severity !== 'none') {
            const base = cls.reason === 'below_min'
                ? `Low Water Temperature: ${v.toFixed(1)}°C (< ${Number(plant.water_temp_min).toFixed(1)}°C).`
                : cls.reason === 'above_max'
                    ? `High Water Temperature: ${v.toFixed(1)}°C (> ${Number(plant.water_temp_max).toFixed(1)}°C).`
                    : cls.reason === 'near_min'
                        ? `Water temp ${v.toFixed(1)}°C near lower bound (${Number(plant.water_temp_min).toFixed(1)}°C).`
                        : `Water temp ${v.toFixed(1)}°C near upper bound (${Number(plant.water_temp_max).toFixed(1)}°C).`;
            push(cls.severity, 5, enrichAlertMessage(plant, 'water_temperature', cls.reason, base));
        }
    }

    if (!candidates.length) return 'All systems normal';

    // Sort: critical first, then by priority asc
    candidates.sort((a, b) => {
        if (a.severity !== b.severity) return a.severity === 'critical' ? -1 : 1;
        return a.priority - b.priority;
    });

    return candidates[0].message;
}
