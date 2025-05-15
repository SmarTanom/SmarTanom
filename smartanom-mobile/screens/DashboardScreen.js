import React, { useEffect, useState, useRef, useContext } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  useWindowDimensions,
  Platform,
  SafeAreaView,
  Image,
  FlatList,
  Modal,
  Animated,
  TouchableWithoutFeedback,
  PanResponder,
} from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import {
  Ionicons,
  MaterialCommunityIcons,
  FontAwesome5,
  Feather,
} from "@expo/vector-icons";
import { LineChart } from "react-native-chart-kit";
import {
  useFonts,
  Montserrat_400Regular,
  Montserrat_500Medium,
  Montserrat_600SemiBold,
  Montserrat_700Bold,
} from "@expo-google-fonts/montserrat";
import { AbrilFatface_400Regular } from "@expo-google-fonts/abril-fatface";
import { useDeviceImages } from "../context/DeviceImageContext";
import Colors from "../constants/Colors";
import { AuthContext } from "../context/AuthContext";
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from "axios";

export default function DashboardScreen() {
  const { user, token } = useContext(AuthContext);
  const navigation = useNavigation();
  const { width } = useWindowDimensions();
  const { getDeviceImage } = useDeviceImages();
  const [username, setUsername] = useState('');
  const [fontsLoaded] = useFonts({
    Montserrat_400Regular,
    Montserrat_500Medium,
    Montserrat_600SemiBold,
    Montserrat_700Bold,
    AbrilFatface_400Regular,
  });

  // Load username from AsyncStorage
  useEffect(() => {
    const loadUsername = async () => {
      try {
        const storedUsername = await AsyncStorage.getItem('username');
        if (storedUsername) {
          setUsername(storedUsername);
        }
      } catch (error) {
        console.error('Failed to load username:', error);
      }
    };

    loadUsername();
  }, []);

  // Simplified state for temperature and humidity
  const [temperature, setTemperature] = useState("--");
  const [humidity, setHumidity] = useState("--");

  const [activeDeviceIndex, setActiveDeviceIndex] = useState(0);
  const [alertModalVisible, setAlertModalVisible] = useState(false);
  const [chartPeriod, setChartPeriod] = useState("days");
  const [chartWidth, setChartWidth] = useState(width - 60);

  const flatListRef = useRef(null);
  const slideAnim = useRef(new Animated.Value(300)).current;
  const fetchIntervalRef = useRef(null);

  // Device data for swipeable cards
  const devices = [
    {
      id: "0000000001",
      name: "Porch SmarTanom",
      get image() {
        return getDeviceImage("0000000001");
      },
    },
    {
      id: "0000000002",
      name: "Backyard SmarTanom",
      get image() {
        return getDeviceImage("0000000002");
      },
    },
  ];

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          slideAnim.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 50) {
          hideAlertModal();
        } else {
          Animated.spring(slideAnim, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  const fetchDHT22Data = async () => {
    try {
      const response = await axios.get(
        "https://smartanom-django-backend-prod.onrender.com/api/hydroponics/dht22-data/",
        {
          headers: {
            Authorization: `Token ${token}`,
          },
        }
      );

      if (response.data.success) {
        // Add debug logging
        console.log("Raw API Response:", response.data);

        // Validate and set temperature
        const temp = parseFloat(response.data.temperature);
        if (!isNaN(temp) && temp !== null) {
          // Always display with 1 decimal place
          setTemperature(temp.toFixed(1));
          console.log("Setting temperature:", temp.toFixed(1));
        } else {
          console.warn("Invalid temperature value received:", response.data.temperature);
          setTemperature("--"); // Set to default if invalid
        }

        // Validate and set humidity
        const hum = parseFloat(response.data.humidity);
        if (!isNaN(hum) && hum !== null) {
          // Always display with 1 decimal place
          setHumidity(hum.toFixed(1));
          console.log("Setting humidity:", hum.toFixed(1));
        } else {
          console.warn("Invalid humidity value received:", response.data.humidity);
          setHumidity("--"); // Set to default if invalid
        }
      } else {
        console.warn("API returned success: false", response.data);
      }
    } catch (error) {
      console.error("Error fetching DHT22 data:", error);
      // Don't update state on error to keep previous values
    }
  };

  // Set up polling when screen is focused
  useFocusEffect(
    React.useCallback(() => {
      fetchDHT22Data(); // Initial fetch
      
      // Update every 10 seconds instead of 3 for more stable readings
      fetchIntervalRef.current = setInterval(fetchDHT22Data, 10000);

      return () => {
        if (fetchIntervalRef.current) {
          clearInterval(fetchIntervalRef.current);
        }
      };
    }, [])
  );

  useEffect(() => {
    setChartWidth(width - 60);
  }, [width]);

  const showAlertModal = () => {
    setAlertModalVisible(true);
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const hideAlertModal = () => {
    Animated.timing(slideAnim, {
      toValue: 300,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setAlertModalVisible(false);
    });
  };

  // Sample data for charts
  const porchPhDataDays = {
    labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    datasets: [
      {
        data: [6.0, 6.1, 6.3, 6.2, 6.4, 6.3, 6.2],
        color: () => Colors.chartGreen,
        strokeWidth: 2,
      },
    ],
  };

  const porchPhDataWeeks = {
    labels: ["Week 1", "Week 2", "Week 3", "Week 4"],
    datasets: [
      {
        data: [6.1, 6.3, 6.2, 6.2],
        color: () => Colors.chartGreen,
        strokeWidth: 2,
      },
    ],
  };

  const backyardPhDataDays = {
    labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    datasets: [
      {
        data: [5.8, 5.9, 6.0, 6.1, 6.0, 5.9, 5.8],
        color: () => Colors.chartGreen,
        strokeWidth: 2,
      },
    ],
  };

  const backyardPhDataWeeks = {
    labels: ["Week 1", "Week 2", "Week 3", "Week 4"],
    datasets: [
      {
        data: [5.9, 6.0, 5.9, 5.8],
        color: () => Colors.chartGreen,
        strokeWidth: 2,
      },
    ],
  };

  const getPhData = () => {
    if (activeDeviceIndex === 0) {
      return chartPeriod === "days" ? porchPhDataDays : porchPhDataWeeks;
    } else {
      return chartPeriod === "days" ? backyardPhDataDays : backyardPhDataWeeks;
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
    yAxisSuffix: "",
    formatYLabel: (yValue) => yValue.toFixed(1),
    paddingLeft: 40,
  };

  if (!fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
      >
        <View style={styles.header}>
          <Text style={styles.greeting}>
            Hello, {user?.name || "User"}
            <Text style={styles.emoji}>🌱</Text>
          </Text>
          {/* Removed warning icon */}
          {/*
          <TouchableOpacity onPress={() => navigation.navigate('ReportIssueScreen')}>
            <Ionicons name="warning-outline" size={24} color="orange" />
          </TouchableOpacity>
          */}
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
              const newIndex = Math.round(
                event.nativeEvent.contentOffset.x / width
              );
              setActiveDeviceIndex(newIndex);
            }}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.deviceCard, { width: width - 32 }]}
                activeOpacity={0.8}
                onPress={() =>
                  navigation.navigate("DeviceDetail", { device: item })
                }
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
                  <Ionicons
                    name="chevron-forward"
                    size={24}
                    color={Colors.primary}
                  />
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
                  index === activeDeviceIndex ? styles.paginationDotActive : {},
                ]}
              />
            ))}
          </View>
        </View>

        {/* Alert Summary */}
        <TouchableOpacity
          style={styles.alertCard}
          activeOpacity={0.7}
          onPress={showAlertModal}
        >
          <View style={styles.alertIconContainer}>
            <View style={styles.alertIconCircle}>
              <Ionicons name="alert-outline" size={20} color={Colors.primary} />
            </View>
          </View>
          <View style={styles.alertContent}>
            <Text style={styles.alertTitle}>Alert Summary</Text>
            {activeDeviceIndex === 0 ? (
              // Porch SmarTanom alert
              <Text style={styles.alertText}>
                EC too low{" "}
                <Text style={styles.alertNote}>(Inadequate nutrients)</Text>
              </Text>
            ) : (
              // Backyard SmarTanom alert
              <Text style={styles.alertText}>
                pH too high{" "}
                <Text style={styles.alertNote}>(Adjust nutrient solution)</Text>
              </Text>
            )}
          </View>
          <View style={styles.alertArrow}>
            <Ionicons name="chevron-forward" size={24} color={Colors.primary} />
          </View>
        </TouchableOpacity>

        {/* Alert Detail Modal */}
        <Modal
          animationType="none"
          transparent={true}
          visible={alertModalVisible}
          onRequestClose={hideAlertModal}
        >
          <TouchableWithoutFeedback onPress={hideAlertModal}>
            <View style={styles.modalOverlay}>
              <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
                <Animated.View
                  style={[
                    styles.modalContent,
                    {
                      transform: [{ translateY: slideAnim }],
                    },
                  ]}
                >
                  <View
                    {...panResponder.panHandlers}
                    style={styles.modalPillContainer}
                  >
                    <View style={styles.modalPill} />
                  </View>

                  <View style={styles.modalBody}>
                    <Text style={styles.modalTitle}>Alert Summary</Text>

                    {activeDeviceIndex === 0 ? (
                      // Porch SmarTanom alert details
                      <Text style={styles.modalAlertText}>
                        EC too low (Inadequate nutrients)
                      </Text>
                    ) : (
                      // Backyard SmarTanom alert details
                      <Text style={styles.modalAlertText}>
                        pH too high (Adjust nutrient solution)
                      </Text>
                    )}

                    <View style={styles.divider} />

                    <Text style={styles.suggestedActionTitle}>
                      Suggested Action
                    </Text>

                    {activeDeviceIndex === 0 ? (
                      // Porch SmarTanom suggested action
                      <Text style={styles.suggestedActionText}>
                        Refill Part A (Calcium Nitrate) and Part B
                        (Micronutrient Mix) to maintain optimal nutrient levels.
                      </Text>
                    ) : (
                      // Backyard SmarTanom suggested action
                      <Text style={styles.suggestedActionText}>
                        Add pH down solution to bring pH levels within optimal
                        range (5.8-6.2).
                      </Text>
                    )}
                  </View>

                  {/* Navigation Bar */}
                  <View style={styles.navBar}>
                    <TouchableOpacity
                      style={styles.navButton}
                      onPress={() => navigation.navigate("Tanom")}
                    >
                      <MaterialCommunityIcons
                        name="sprout"
                        size={24}
                        color={Colors.primary}
                      />
                      <Text
                        style={[
                          styles.navButtonText,
                          { color: Colors.primary },
                        ]}
                      >
                        Tanom
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.navButton}
                      onPress={() => navigation.navigate("Alerts")}
                    >
                      <Ionicons
                        name="notifications-outline"
                        size={24}
                        color={Colors.darkGray}
                      />
                      <Text style={styles.navButtonText}>Alerts</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.navButton}
                      onPress={() => navigation.navigate("Profile")}
                    >
                      <Ionicons
                        name="person-outline"
                        size={24}
                        color={Colors.darkGray}
                      />
                      <Text style={styles.navButtonText}>Profile</Text>
                    </TouchableOpacity>
                  </View>
                </Animated.View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>

        {/* Device Info Summary */}
        <View style={styles.statusRow}>
          <StatusBox
            icon="wifi"
            label="Connectivity"
            value={activeDeviceIndex === 0 ? "Online" : "Online"}
          />
          <StatusBox
            icon="time-outline"
            label="Last Data"
            value={activeDeviceIndex === 0 ? "5m ago" : "12m ago"}
          />
          <StatusBox
            icon="battery-full"
            label="Battery"
            value={activeDeviceIndex === 0 ? "78%" : "92%"}
          />
        </View>

        {/* Nutrient Level */}
        <View style={styles.nutrientCard}>
          <Text style={styles.nutrientTitle}>Nutrient Level</Text>
          <View style={styles.nutrientStatusContainer}>
            <MaterialCommunityIcons
              name="sprout"
              size={24}
              color={Colors.primary}
            />
            {activeDeviceIndex === 0 ? (
              // Porch SmarTanom nutrient level
              <Text style={styles.nutrientStatus}>
                <Text style={styles.nutrientStatusText}>Low </Text>
                <Text style={styles.nutrientNote}>
                  (Nutrient needs refilling)
                </Text>
              </Text>
            ) : (
              // Backyard SmarTanom nutrient level
              <Text style={styles.nutrientStatus}>
                <Text style={styles.nutrientStatusText}>Optimal </Text>
                <Text style={styles.nutrientNote}>
                  (Nutrient level is good)
                </Text>
              </Text>
            )}
          </View>
        </View>

        {/* pH Chart */}
        <View style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <View style={styles.chartTitleContainer}>
              <MaterialCommunityIcons
                name="chart-line"
                size={20}
                color={Colors.primary}
              />
              <Text style={styles.chartTitle}>pH Levels over time</Text>
            </View>
            <View style={styles.chartPeriodSelector}>
              <TouchableOpacity onPress={() => setChartPeriod("days")}>
                <Text
                  style={
                    chartPeriod === "days"
                      ? styles.chartPeriodActive
                      : styles.chartPeriod
                  }
                >
                  Days
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setChartPeriod("weeks")}>
                <Text
                  style={
                    chartPeriod === "weeks"
                      ? styles.chartPeriodActive
                      : styles.chartPeriod
                  }
                >
                  Weeks
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.deviceSelector}>
            <View style={styles.deviceSelectorDot}></View>
            <Text style={styles.deviceSelectorText}>
              {devices[activeDeviceIndex].name}
            </Text>
          </View>

          <View style={styles.chartContainer}>
            {/* Custom pH labels on the left side */}
            <View style={styles.customYAxisLabels}>
              {activeDeviceIndex === 0 ? (
                // Porch SmarTanom pH values
                <>
                  <Text style={styles.yAxisLabel}>6.6 pH</Text>
                  <Text style={styles.yAxisLabel}>6.5 pH</Text>
                  <Text style={styles.yAxisLabel}>6.4 pH</Text>
                  <Text style={styles.yAxisLabel}>6.3 pH</Text>
                  <Text style={styles.yAxisLabel}>6.2 pH</Text>
                  <Text style={styles.yAxisLabel}>6.1 pH</Text>
                  <Text style={styles.yAxisLabel}>6.0 pH</Text>
                </>
              ) : (
                // Backyard SmarTanom pH values
                <>
                  <Text style={styles.yAxisLabel}>6.2 pH</Text>
                  <Text style={styles.yAxisLabel}>6.1 pH</Text>
                  <Text style={styles.yAxisLabel}>6.0 pH</Text>
                  <Text style={styles.yAxisLabel}>5.9 pH</Text>
                  <Text style={styles.yAxisLabel}>5.8 pH</Text>
                  <Text style={styles.yAxisLabel}>5.7 pH</Text>
                  <Text style={styles.yAxisLabel}>5.6 pH</Text>
                </>
              )}
            </View>

            {/* The actual chart */}
            <View style={styles.chartWrapper}>
              <LineChart
                data={phData}
                width={chartWidth - 50} // Reduce width to make room for custom labels
                height={180}
                chartConfig={{
                  ...chartConfig,
                  // Hide the default y-axis labels completely
                  formatYLabel: () => "",
                  // Hide the y-axis completely
                  propsForLabels: { opacity: 0 },
                  // Remove left padding since we're using custom labels
                  paddingLeft: 0,
                }}
                bezier
                withHorizontalLines={true}
                withVerticalLines={false}
                withDots={false}
                withInnerLines={true}
                withOuterLines={true}
                withShadow={false}
                yAxisLabel=""
                // Don't render any y-axis labels
                renderDotContent={() => null}
                // Don't show any y-axis labels
                withVerticalLabels={true}
                withHorizontalLabels={false}
                // Don't start from zero
                fromZero={false}
                // Hide all y-axis elements
                hidePointsAtIndex={[]}
                style={styles.chart}
              />
            </View>
          </View>

          <Text style={styles.currentPH}>
            Current pH level:{" "}
            <Text style={styles.phValue}>
              {activeDeviceIndex === 0 ? "6.2" : "5.8"} pH
            </Text>
          </Text>
        </View>

        {/* Sensor Metrics */}
        <View style={styles.metricsGrid}>
          {activeDeviceIndex === 0 ? (
            // Porch SmarTanom metrics
            <>
              <MetricBox
                icon="water-outline"
                label="EC Levels"
                value="2.4 mS/cm"
              />
              <MetricBox icon="flask-outline" label="TDS" value="950 ppm" />
              <MetricBox icon="water" label="Water Level" value="85%" />
              <MetricBox icon="water-opacity" label="Turbidity" value="3 NTU" />
            </>
          ) : (
            // Backyard SmarTanom metrics
            <>
              <MetricBox
                icon="water-outline"
                label="EC Levels"
                value="1.8 mS/cm"
              />
              <MetricBox icon="flask-outline" label="TDS" value="720 ppm" />
              <MetricBox icon="water" label="Water Level" value="92%" />
              <MetricBox icon="water-opacity" label="Turbidity" value="5 NTU" />
            </>
          )}
        </View>

        {/* Environmental Conditions */}
        <View style={styles.environmentCard}>
          <Text style={styles.environmentTitle}>Environment Conditions</Text>
          {activeDeviceIndex === 0 ? (
            // Porch SmarTanom environmental conditions
            <>
               <Condition
              icon="temperature-low"
              iconType="fa"
              label="Temperature"
              value={`${temperature}°C`}
            />
            <Condition
              icon="droplet"
              iconType="feather"
              label="Humidity"
              value={`${humidity}%`}
            />
              <Condition
                icon="white-balance-sunny"
                iconType="material"
                label="Light Intensity"
                value="9,000 Lux"
              />
              <Condition
                icon="molecule-co2"
                iconType="material"
                label="CO₂ Level"
                value="415 ppm"
              />
            </>
          ) : (
            // Backyard SmarTanom environmental conditions
            <>
              <Condition
                icon="temperature-low"
                iconType="fa"
                label="Temperature"
                value="26.8°C"
              />
              <Condition
                icon="droplet"
                iconType="feather"
                label="Humidity"
                value="72%"
              />
              <Condition
                icon="white-balance-sunny"
                iconType="material"
                label="Light Intensity"
                value="12,500 Lux"
              />
              <Condition
                icon="molecule-co2"
                iconType="material"
                label="CO₂ Level"
                value="430 ppm"
              />
            </>
          )}
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
      {iconType === "fa" && (
        <FontAwesome5 name={icon} size={18} color={Colors.primary} />
      )}
      {iconType === "feather" && (
        <Feather name={icon} size={18} color={Colors.primary} />
      )}
      {iconType === "material" && (
        <MaterialCommunityIcons name={icon} size={18} color={Colors.primary} />
      )}
      <Text style={styles.conditionText}>{label}</Text>
      <Text style={styles.conditionValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f6fef8",
    paddingTop: Platform.OS === "android" ? 30 : 0, // Add extra padding for Android status bar
  },
  container: {
    flex: 1,
    backgroundColor: "#f6fef8",
    position: "relative",
  },
  contentContainer: {
    padding: 16,
    paddingBottom: Platform.OS === "ios" ? 90 : 70,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 0,
  },
  modalPillContainer: {
    paddingVertical: 10,
    alignItems: "center",
    width: "100%",
  },
  modalPill: {
    width: 40,
    height: 5,
    backgroundColor: "#e0e0e0",
    borderRadius: 3,
  },
  modalBody: {
    padding: 20,
    paddingBottom: 10,
  },
  modalTitle: {
    fontFamily: "Montserrat_600SemiBold",
    fontSize: 20,
    color: Colors.secondary,
    textAlign: "center",
    marginBottom: 15,
  },
  modalAlertText: {
    fontFamily: "Montserrat_500Medium",
    fontSize: 18,
    color: Colors.alertRed, // Using the SmarTanom alert color #CD5151
    marginBottom: 5,
    textAlign: "center",
  },
  divider: {
    height: 1,
    backgroundColor: "#f0f0f0",
    marginVertical: 15,
  },
  suggestedActionTitle: {
    fontFamily: "Montserrat_600SemiBold",
    fontSize: 18,
    color: Colors.secondary,
    marginBottom: 10,
    textAlign: "center",
  },
  suggestedActionText: {
    fontFamily: "Montserrat_500Medium",
    fontSize: 16,
    color: Colors.darkGray,
    lineHeight: 24,
    textAlign: "center",
    paddingHorizontal: 10,
  },
  navBar: {
    flexDirection: "row",
    justifyContent: "space-around",
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    paddingTop: 10,
    paddingBottom: Platform.OS === "ios" ? 30 : 15,
    backgroundColor: Colors.white,
    marginTop: 20,
  },
  navButton: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  navButtonText: {
    fontFamily: "Montserrat_400Regular",
    fontSize: 12,
    color: Colors.darkGray,
    marginTop: 4,
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  greeting: {
    fontFamily: "AbrilFatface_400Regular",
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
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },
  deviceImage: {
    width: "100%",
    height: 150,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  deviceCardContent: {
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  settingsButton: {
    marginRight: 8,
    padding: 4,
  },
  cardTitle: {
    fontFamily: "Montserrat_600SemiBold",
    fontSize: 16,
    color: Colors.secondary,
  },
  cardSubtitle: {
    fontFamily: "Montserrat_400Regular",
    fontSize: 12,
    color: Colors.darkGray,
    marginTop: 2,
  },
  paginationDots: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
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
    flexDirection: "row",
    elevation: 2,
    alignItems: "center",
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
    justifyContent: "center",
    alignItems: "center",
  },
  alertContent: {
    flex: 1,
  },
  alertTitle: {
    fontFamily: "Montserrat_600SemiBold",
    fontSize: 18,
    color: Colors.secondary,
    marginBottom: 6,
  },
  alertText: {
    fontFamily: "Montserrat_600SemiBold",
    color: Colors.alertRed,
    fontSize: 16,
  },
  alertNote: {
    fontFamily: "Montserrat_400Regular",
    color: Colors.darkGray,
    fontSize: 15,
  },
  alertArrow: {
    padding: 4,
  },
  statusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  statusBox: {
    flex: 1,
    backgroundColor: Colors.white,
    marginHorizontal: 4,
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
    elevation: 2,
  },
  statusValue: {
    fontFamily: "Montserrat_600SemiBold",
    fontSize: 14,
    color: Colors.secondary,
    marginTop: 4,
    marginBottom: 2,
  },
  statusLabel: {
    fontFamily: "Montserrat_400Regular",
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
    fontFamily: "Montserrat_600SemiBold",
    fontSize: 18,
    color: Colors.secondary,
    marginBottom: 12,
  },
  nutrientStatusContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  nutrientStatus: {
    marginLeft: 10,
  },
  nutrientStatusText: {
    fontFamily: "Montserrat_600SemiBold",
    fontSize: 16,
    color: Colors.primary,
  },
  nutrientNote: {
    fontFamily: "Montserrat_400Regular",
    fontSize: 16,
    color: Colors.darkGray,
  },
  chartCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    marginBottom: 16,
    padding: 16,
    paddingLeft: 16, // Reset to default as we're using custom labels
    paddingRight: 12,
    elevation: 2,
  },
  chartHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
    paddingHorizontal: 8,
  },
  chartTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  chartTitle: {
    fontFamily: "Montserrat_500Medium",
    fontSize: 14,
    color: Colors.darkGray,
    marginLeft: 8,
  },
  chartPeriodSelector: {
    flexDirection: "row",
    backgroundColor: Colors.lightGray,
    borderRadius: 12,
    padding: 2,
  },
  chartPeriod: {
    fontFamily: "Montserrat_400Regular",
    fontSize: 12,
    color: Colors.darkGray,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  chartPeriodActive: {
    fontFamily: "Montserrat_500Medium",
    fontSize: 12,
    color: Colors.secondary,
    backgroundColor: Colors.white,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  deviceSelector: {
    flexDirection: "row",
    alignItems: "center",
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
    fontFamily: "Montserrat_400Regular",
    fontSize: 12,
    color: Colors.darkGray,
  },

  chartContainer: {
    position: "relative",
    width: "100%",
    flexDirection: "row", // Arrange custom labels and chart side by side
    alignItems: "center",
    justifyContent: "flex-start",
    paddingLeft: 0,
    paddingRight: 0,
  },
  customYAxisLabels: {
    width: 50, // Fixed width for the labels column
    height: 180, // Match the chart height
    justifyContent: "space-between", // Distribute labels evenly
    alignItems: "flex-end", // Align text to the right
    paddingRight: 8, // Small padding between labels and chart
    paddingVertical: 10, // Padding to align with chart grid lines
    marginRight: 5, // Add margin to separate from chart
  },
  yAxisLabel: {
    fontFamily: "Montserrat_500Medium",
    fontSize: 10,
    color: Colors.darkGray,
    textAlign: "right",
    lineHeight: 14, // Ensure consistent spacing
  },
  chartWrapper: {
    flex: 1, // Take remaining space
  },
  chart: {
    borderRadius: 8,
    paddingRight: 16,
    marginLeft: 0,
  },
  currentPH: {
    fontFamily: "Montserrat_400Regular",
    fontSize: 14,
    textAlign: "right",
    color: Colors.darkGray,
    marginTop: 8,
    paddingHorizontal: 8,
  },
  phValue: {
    fontFamily: "Montserrat_600SemiBold",
    color: Colors.secondary,
  },
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  metricBox: {
    backgroundColor: Colors.white,
    width: "48%",
    padding: 16,
    borderRadius: 10,
    marginBottom: 12,
    elevation: 2,
    alignItems: "center",
  },
  metricLabel: {
    fontFamily: "Montserrat_400Regular",
    color: Colors.darkGray,
    fontSize: 12,
    marginTop: 4,
  },
  metricValue: {
    fontFamily: "Montserrat_600SemiBold",
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
    fontFamily: "Montserrat_600SemiBold",
    fontSize: 16,
    marginBottom: 12,
    color: Colors.secondary,
  },
  conditionRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 8,
  },
  conditionText: {
    flex: 1,
    marginLeft: 12,
    fontFamily: "Montserrat_400Regular",
    fontSize: 14,
    color: Colors.darkGray,
  },
  conditionValue: {
    fontFamily: "Montserrat_600SemiBold",
    fontSize: 14,
    color: Colors.secondary,
  },
});
