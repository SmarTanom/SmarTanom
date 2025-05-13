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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f6fef8',
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 100,
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.primary,
    marginBottom: 16,
  },
  card: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.primary,
  },
  cardSubtitle: {
    fontSize: 14,
    color: 'gray',
  },
  alertText: {
    color: '#e53935',
    fontWeight: 'bold',
  },
  alertNote: {
    fontWeight: 'normal',
  },
  rowCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  infoBox: {
    flex: 1,
    backgroundColor: '#ffffff',
    marginHorizontal: 4,
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  infoText: {
    fontSize: 12,
    marginTop: 4,
    color: Colors.primary,
  },
  chartPlaceholder: {
    height: 150,
    backgroundColor: '#e0f2f1',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 8,
  },
  chartText: {
    color: '#666',
  },
  currentPH: {
    fontSize: 14,
    textAlign: 'right',
    color: Colors.primary,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  metricBox: {
    backgroundColor: '#ffffff',
    flex: 1,
    padding: 16,
    marginHorizontal: 4,
    borderRadius: 10,
  },
  metricLabel: {
    color: 'gray',
    fontSize: 13,
  },
  metricValue: {
    fontWeight: 'bold',
    fontSize: 16,
    color: Colors.primary,
  },
  sectionTitle: {
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 8,
    color: Colors.primary,
  },
  conditionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  conditionText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: '#333',
  },
  conditionValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
});
