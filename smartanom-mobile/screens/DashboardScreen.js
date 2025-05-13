import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, useWindowDimensions, Platform, SafeAreaView, Image, FlatList } from 'react-native';
import { Ionicons, MaterialCommunityIcons, FontAwesome5, Feather } from '@expo/vector-icons';
import { LineChart } from 'react-native-chart-kit';
import { useFonts, Montserrat_400Regular, Montserrat_500Medium, Montserrat_600SemiBold, Montserrat_700Bold } from '@expo-google-fonts/montserrat';
import { AbrilFatface_400Regular } from '@expo-google-fonts/abril-fatface';
import Colors from '../constants/Colors';

export default function DashboardScreen() {
  const { width, height } = useWindowDimensions();
  const [fontsLoaded] = useFonts({
    Montserrat_400Regular,
    Montserrat_500Medium,
    Montserrat_600SemiBold,
    Montserrat_700Bold,
    AbrilFatface_400Regular,
  });

  // Device data for swipeable cards
  const devices = [
    {
      id: '0000000001',
      name: 'Porch SmarTanom',
      image: require('../assets/porch-plant.png'),
    },
    {
      id: '0000000002',
      name: 'Backyard SmarTanom',
      image: require('../assets/hydroponic-plant.jpg'),
    }
  ];

  const [activeDeviceIndex, setActiveDeviceIndex] = useState(0);
  const flatListRef = useRef(null);

  // Chart period state (Days or Weeks)
  const [chartPeriod, setChartPeriod] = useState('days');

  // Calculate responsive sizes
  const [chartWidth, setChartWidth] = useState(width - 60); // Reduced width to account for padding

  useEffect(() => {
    // Update chart width when screen dimensions change
    setChartWidth(width - 60); // Reduced width to account for padding
  }, [width]);

  // Sample data for Porch SmarTanom - Days
  const porchPhDataDays = {
    labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    datasets: [
      {
        data: [6.0, 6.1, 6.3, 6.2, 6.4, 6.3, 6.2],
        color: () => Colors.chartGreen,
        strokeWidth: 2
      }
    ],
  };

  // Sample data for Porch SmarTanom - Weeks
  const porchPhDataWeeks = {
    labels: ["Week 1", "Week 2", "Week 3", "Week 4"],
    datasets: [
      {
        data: [6.1, 6.3, 6.2, 6.2],
        color: () => Colors.chartGreen,
        strokeWidth: 2
      }
    ],
  };

  // Sample data for Backyard SmarTanom - Days
  const backyardPhDataDays = {
    labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    datasets: [
      {
        data: [5.8, 5.9, 6.0, 6.1, 6.0, 5.9, 5.8],
        color: () => Colors.chartGreen,
        strokeWidth: 2
      }
    ],
  };

  // Sample data for Backyard SmarTanom - Weeks
  const backyardPhDataWeeks = {
    labels: ["Week 1", "Week 2", "Week 3", "Week 4"],
    datasets: [
      {
        data: [5.9, 6.0, 5.9, 5.8],
        color: () => Colors.chartGreen,
        strokeWidth: 2
      }
    ],
  };

  // Get the appropriate data based on the selected device and period
  const getPhData = () => {
    if (activeDeviceIndex === 0) {
      return chartPeriod === 'days' ? porchPhDataDays : porchPhDataWeeks;
    } else {
      return chartPeriod === 'days' ? backyardPhDataDays : backyardPhDataWeeks;
    }
  };

  const phData = getPhData();

  const chartConfig = {
    backgroundGradientFrom: Colors.white,
    backgroundGradientTo: Colors.white,
    decimalPlaces: 1,
    color: () => Colors.chartGreen,
    labelColor: () => Colors.darkGray,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: "0",
    },
    propsForBackgroundLines: {
      strokeDasharray: "",
      stroke: Colors.lightGray,
    },
    yAxisSuffix: '',
    yAxisInterval: 0.1,
    formatYLabel: (yValue) => Number(yValue).toFixed(1),
    // Add left padding for y-axis labels
    paddingLeft: 15,
  };

  if (!fontsLoaded) {
    return null; // Return null or a loading screen while fonts are loading
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        <View style={styles.header}>
          <Text style={styles.greeting}>Hello, User <Text style={styles.emoji}>🌱</Text></Text>
          <Ionicons name="settings-outline" size={24} color={Colors.primary} />
        </View>

      {/* Device Cards - Swipeable */}
      <View style={styles.deviceCardsContainer}>
        <FlatList
          ref={flatListRef}
          data={devices}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item.id}
          onMomentumScrollEnd={(event) => {
            const newIndex = Math.round(event.nativeEvent.contentOffset.x / width);
            setActiveDeviceIndex(newIndex);
          }}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.deviceCard, { width: width - 32 }]}
              activeOpacity={0.8}
            >
              <Image
                source={item.image}
                style={styles.deviceImage}
                resizeMode="cover"
              />
              <View style={styles.deviceCardContent}>
                <View>
                  <Text style={styles.cardTitle}>{item.name}</Text>
                  <Text style={styles.cardSubtitle}>ID: {item.id}</Text>
                </View>
                <Ionicons name="chevron-forward" size={24} color={Colors.primary} />
              </View>
            </TouchableOpacity>
          )}
        />
        <View style={styles.paginationDots}>
          {devices.map((_, index) => (
            <View
              key={index}
              style={[
                styles.paginationDot,
                index === activeDeviceIndex ? styles.paginationDotActive : {}
              ]}
            />
          ))}
        </View>
      </View>

      {/* Alert Summary */}
      <View style={styles.alertCard}>
        <View style={styles.alertIconContainer}>
          <View style={styles.alertIconCircle}>
            <Ionicons name="alert-outline" size={20} color={Colors.primary} />
          </View>
        </View>
        <View style={styles.alertContent}>
          <Text style={styles.alertTitle}>Alert Summary</Text>
          <Text style={styles.alertText}>EC too low <Text style={styles.alertNote}>(Inadequate nutrients)</Text></Text>
        </View>
        <TouchableOpacity style={styles.alertArrow}>
          <Ionicons name="chevron-forward" size={24} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Device Info Summary */}
      <View style={styles.statusRow}>
        <StatusBox icon="wifi" label="Connectivity" value="Online" />
        <StatusBox icon="time-outline" label="Last Data" value="5m ago" />
        <StatusBox icon="battery-full" label="Battery" value="78%" />
      </View>

      {/* Nutrient Level */}
      <View style={styles.nutrientCard}>
        <Text style={styles.nutrientTitle}>Nutrient Level</Text>
        <View style={styles.nutrientStatusContainer}>
          <MaterialCommunityIcons name="sprout" size={24} color={Colors.primary} />
          <Text style={styles.nutrientStatus}>
            <Text style={styles.nutrientStatusText}>Low </Text>
            <Text style={styles.nutrientNote}>(Nutrient needs refilling)</Text>
          </Text>
        </View>
      </View>

      {/* pH Chart */}
      <View style={styles.chartCard}>
        <View style={styles.chartHeader}>
          <View style={styles.chartTitleContainer}>
            <MaterialCommunityIcons name="chart-line" size={20} color={Colors.primary} />
            <Text style={styles.chartTitle}>pH Levels over time</Text>
          </View>
          <View style={styles.chartPeriodSelector}>
            <TouchableOpacity onPress={() => setChartPeriod('days')}>
              <Text style={chartPeriod === 'days' ? styles.chartPeriodActive : styles.chartPeriod}>Days</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setChartPeriod('weeks')}>
              <Text style={chartPeriod === 'weeks' ? styles.chartPeriodActive : styles.chartPeriod}>Weeks</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.deviceSelector}>
          <View style={styles.deviceSelectorDot}></View>
          <Text style={styles.deviceSelectorText}>{devices[activeDeviceIndex].name}</Text>
        </View>

        <View style={styles.chartContainer}>
          <LineChart
            data={phData}
            width={chartWidth}
            height={180}
            chartConfig={chartConfig}
            bezier
            withHorizontalLines={true}
            withVerticalLines={false}
            withDots={false}
            withInnerLines={true}
            withOuterLines={true}
            withShadow={false}
            yAxisLabel=""
            yAxisInterval={0.1}
            fromZero={false}
            style={styles.chart}
            // Add margin to ensure y-axis labels are visible
            yLabelsOffset={10}
          />
        </View>

        <Text style={styles.currentPH}>Current pH level: <Text style={styles.phValue}>{activeDeviceIndex === 0 ? '6.2' : '5.8'} pH</Text></Text>
      </View>

      {/* Sensor Metrics */}
      <View style={styles.metricsGrid}>
        <MetricBox icon="water-outline" label="EC Levels" value="2.4 mS/cm" />
        <MetricBox icon="flask-outline" label="TDS" value="950 ppm" />
        <MetricBox icon="water" label="Water Level" value="85%" />
        <MetricBox icon="water-opacity" label="Turbidity" value="3 NTU" />
      </View>

      {/* Environmental Conditions */}
      <View style={styles.environmentCard}>
        <Text style={styles.environmentTitle}>Environment Conditions</Text>
        <Condition icon="temperature-low" iconType="fa" label="Temperature" value="24.2°C" />
        <Condition icon="droplet" iconType="feather" label="Humidity" value="68%" />
        <Condition icon="white-balance-sunny" iconType="material" label="Light Intensity" value="9,000 Lux" />
        <Condition icon="molecule-co2" iconType="material" label="CO₂ Level" value="415 ppm" />
      </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatusBox({ icon, label, value }) {
  return (
    <View style={styles.statusBox}>
      <Ionicons
        name={icon === "battery-full" ? "battery-full" : icon}
        size={20}
        color={Colors.primary}
      />
      <Text style={styles.statusValue}>{value}</Text>
      <Text style={styles.statusLabel}>{label}</Text>
    </View>
  );
}

function MetricBox({ icon, label, value }) {
  return (
    <View style={styles.metricBox}>
      <MaterialCommunityIcons name={icon} size={24} color={Colors.primary} />
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function Condition({ icon, iconType, label, value }) {
  return (
    <View style={styles.conditionRow}>
      {iconType === 'fa' && <FontAwesome5 name={icon} size={18} color={Colors.primary} />}
      {iconType === 'feather' && <Feather name={icon} size={18} color={Colors.primary} />}
      {iconType === 'material' && <MaterialCommunityIcons name={icon} size={18} color={Colors.primary} />}
      <Text style={styles.conditionText}>{label}</Text>
      <Text style={styles.conditionValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f6fef8',
    paddingTop: Platform.OS === 'android' ? 30 : 0, // Add extra padding for Android status bar
  },
  container: {
    flex: 1,
    backgroundColor: '#f6fef8',
    position: 'relative',
  },
  contentContainer: {
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 90 : 70,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  greeting: {
    fontFamily: 'AbrilFatface_400Regular',
    fontSize: 28,
    color: Colors.headerText,
    letterSpacing: 0.5,
  },
  emoji: {
    fontSize: 22,
  },
  deviceCardsContainer: {
    marginBottom: 16,
  },
  deviceCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    elevation: 2,
    overflow: 'hidden',
  },
  deviceImage: {
    width: '100%',
    height: 150,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  deviceCardContent: {
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 16,
    color: Colors.secondary,
  },
  cardSubtitle: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 12,
    color: Colors.darkGray,
    marginTop: 2,
  },
  paginationDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.lightGray,
    marginHorizontal: 4,
  },
  paginationDotActive: {
    backgroundColor: Colors.primary,
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  alertCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    marginBottom: 16,
    padding: 16,
    flexDirection: 'row',
    elevation: 2,
    alignItems: 'center',
  },
  alertIconContainer: {
    marginRight: 16,
  },
  alertIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertContent: {
    flex: 1,
  },
  alertTitle: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 18,
    color: Colors.secondary,
    marginBottom: 6,
  },
  alertText: {
    fontFamily: 'Montserrat_600SemiBold',
    color: Colors.alertRed,
    fontSize: 16,
  },
  alertNote: {
    fontFamily: 'Montserrat_400Regular',
    color: Colors.darkGray,
    fontSize: 15,
  },
  alertArrow: {
    padding: 4,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statusBox: {
    flex: 1,
    backgroundColor: Colors.white,
    marginHorizontal: 4,
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
    elevation: 2,
  },
  statusValue: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 14,
    color: Colors.secondary,
    marginTop: 4,
    marginBottom: 2,
  },
  statusLabel: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 10,
    color: Colors.darkGray,
  },
  nutrientCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    marginBottom: 16,
    padding: 16,
    elevation: 2,
  },
  nutrientTitle: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 18,
    color: Colors.secondary,
    marginBottom: 12,
  },
  nutrientStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  nutrientStatus: {
    marginLeft: 10,
  },
  nutrientStatusText: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 16,
    color: Colors.primary,
  },
  nutrientNote: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 16,
    color: Colors.darkGray,
  },
  chartCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    marginBottom: 16,
    padding: 16,
    paddingHorizontal: 12, // Increased from 8 to provide more space
    elevation: 2,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 8,
  },
  chartTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chartTitle: {
    fontFamily: 'Montserrat_500Medium',
    fontSize: 14,
    color: Colors.darkGray,
    marginLeft: 8,
  },
  chartPeriodSelector: {
    flexDirection: 'row',
    backgroundColor: Colors.lightGray,
    borderRadius: 12,
    padding: 2,
  },
  chartPeriod: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 12,
    color: Colors.darkGray,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  chartPeriodActive: {
    fontFamily: 'Montserrat_500Medium',
    fontSize: 12,
    color: Colors.secondary,
    backgroundColor: Colors.white,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  deviceSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 8,
  },
  deviceSelectorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
    marginRight: 6,
  },
  deviceSelectorText: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 12,
    color: Colors.darkGray,
  },

  chartContainer: {
    position: 'relative',
    width: '100%',
    alignItems: 'center',
    paddingLeft: 15, // Add left padding for y-axis labels
    paddingRight: 8,
  },
  chart: {
    borderRadius: 8,
    paddingRight: 16,
    marginLeft: 10, // Add margin to prevent labels from being cut off
  },
  currentPH: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 14,
    textAlign: 'right',
    color: Colors.darkGray,
    marginTop: 8,
    paddingHorizontal: 8,
  },
  phValue: {
    fontFamily: 'Montserrat_600SemiBold',
    color: Colors.secondary,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  metricBox: {
    backgroundColor: Colors.white,
    width: '48%',
    padding: 16,
    borderRadius: 10,
    marginBottom: 12,
    elevation: 2,
    alignItems: 'center',
  },
  metricLabel: {
    fontFamily: 'Montserrat_400Regular',
    color: Colors.darkGray,
    fontSize: 12,
    marginTop: 4,
  },
  metricValue: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 16,
    color: Colors.secondary,
    marginTop: 4,
  },
  environmentCard: {
    backgroundColor: Colors.white,
    padding: 16,
    borderRadius: 12,
    marginBottom: 10,
    elevation: 2,
  },
  environmentTitle: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 16,
    marginBottom: 12,
    color: Colors.secondary,
  },
  conditionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
  },
  conditionText: {
    flex: 1,
    marginLeft: 12,
    fontFamily: 'Montserrat_400Regular',
    fontSize: 14,
    color: Colors.darkGray,
  },
  conditionValue: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 14,
    color: Colors.secondary,
  },
});
