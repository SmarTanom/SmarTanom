import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import Colors from '../constants/Colors';

export default function DashboardScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Text style={styles.greeting}>Hello, User 👋</Text>

      {/* Device Card */}
      <TouchableOpacity style={styles.card}>
        <Text style={styles.cardTitle}>Porch SmarTanom</Text>
        <Text style={styles.cardSubtitle}>ID: 0000000001</Text>
      </TouchableOpacity>

      {/* Alert Summary */}
      <View style={styles.card}>
        <Text style={styles.alertText}>EC too low <Text style={styles.alertNote}>(inadequate nutrients)</Text></Text>
      </View>

      {/* Device Info Summary */}
      <View style={styles.rowCard}>
        <InfoBox icon="wifi" label="Online" />
        <InfoBox icon="sync-circle" label="5 mins ago" />
        <InfoBox icon="battery" label="78%" />
      </View>

      {/* Nutrient Level */}
      <View style={styles.card}>
        <Text style={styles.alertText}>Low <Text style={styles.alertNote}>(nutrient needs refilling)</Text></Text>
      </View>

      {/* pH Chart */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>pH Levels over time</Text>
        {/* Placeholder for chart */}
        <View style={styles.chartPlaceholder}>
          <Text style={styles.chartText}>[pH Graph Here]</Text>
        </View>
        <Text style={styles.currentPH}>Current pH level: <Text style={{ fontWeight: 'bold' }}>6.2 pH</Text></Text>
      </View>

      {/* Sensor Metrics */}
      <View style={styles.metricsRow}>
        <MetricBox label="EC Levels" value="2.4 mS/cm" />
        <MetricBox label="TDS" value="950 ppm" />
      </View>
      <View style={styles.metricsRow}>
        <MetricBox label="Water Level" value="85%" />
        <MetricBox label="Turbidity" value="3 NTU" />
      </View>

      {/* Environmental Conditions */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Environment Conditions</Text>
        <Condition label="Temperature" value="24.2°C" />
        <Condition label="Humidity" value="68%" />
        <Condition label="Light Intensity" value="9,000 Lux" />
        <Condition label="CO₂ Level" value="415 ppm" />
      </View>
    </ScrollView>
  );
}

function InfoBox({ icon, label }) {
    return (
      <View style={styles.infoBox}>
        <Ionicons name={icon === "battery" ? "battery-full" : icon} size={20} color={Colors.primary} />
        <Text style={styles.infoText}>{label}</Text>
      </View>
    );
  }

function MetricBox({ label, value }) {
  return (
    <View style={styles.metricBox}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

function Condition({ label, value }) {
  return (
    <View style={styles.conditionRow}>
      <MaterialCommunityIcons name="leaf" size={20} color={Colors.primary} />
      <Text style={styles.conditionText}>{label}</Text>
      <Text style={styles.conditionValue}>{value}</Text>
    </View>
  );
}

