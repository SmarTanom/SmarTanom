import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import InputField from "../components/InputField";
import Colors from "../constants/Colors";
import { Ionicons } from "@expo/vector-icons";  // Import Ionicons for the icons

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome back!</Text>
      <Text style={styles.subtitle}>
        Let’s get back to growing your SmarTanom, shall we?
      </Text>

      <InputField
        placeholder="Email Address"
        value={email}
        onChangeText={setEmail}
      />
      <InputField
        placeholder="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      <TouchableOpacity>
        <Text style={styles.forgot}>Forgot your password?</Text>
      </TouchableOpacity>

      <Text style={styles.or}>Or Login using social media</Text>

      <View style={styles.socialRow}>
        {/* Facebook Login Button */}
        <TouchableOpacity style={styles.socialBtn}>
          <Ionicons name="logo-facebook" size={20} color={Colors.primary} />
          <Text style={styles.socialText}> Facebook</Text>
        </TouchableOpacity>
        {/* Google Login Button */}
        <TouchableOpacity style={styles.socialBtn}>
          <Ionicons name="logo-google" size={20} color={Colors.primary} />
          <Text style={styles.socialText}> Google</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.button}
        onPress={() => {
          // Later: You can replace this with API login validation logic
          navigation.navigate("Dashboard");
        }}
      >
        <Text style={styles.buttonText}>Login</Text>
      </TouchableOpacity>

      <Text style={styles.footer}>
        New to SmarTanom?{" "}
        <Text
          style={styles.link}
          onPress={() => navigation.navigate("Register")}
        >
          Register
        </Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primary,
    padding: 20,
    justifyContent: "center",
  },
  title: {
    color: Colors.white,
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 10,
  },
  subtitle: {
    color: Colors.white,
    marginBottom: 20,
  },
  forgot: {
    color: Colors.white,
    textAlign: "right",
    marginBottom: 10,
    textDecorationLine: "underline",
  },
  or: {
    color: Colors.white,
    textAlign: "center",
    marginVertical: 10,
  },
  socialRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 20,
  },
  socialBtn: {
    backgroundColor: Colors.white,
    padding: 10,
    borderRadius: 6,
    flexDirection: "row",
    alignItems: "center",
  },
  socialText: {
    marginLeft: 8,
    color: Colors.primary,
    fontWeight: "bold",
  },
  button: {
    backgroundColor: Colors.white,
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  buttonText: {
    color: Colors.primary,
    fontWeight: "bold",
  },
  footer: {
    color: Colors.white,
    marginTop: 15,
    textAlign: "center",
  },
  link: {
    textDecorationLine: "underline",
    fontWeight: "bold",
  },
});
