#include <Arduino.h>
#include <WiFi.h>
#include "esp_wifi.h"
#include "nvs_flash.h"

void clearAllNVS() {
  Serial.println("🧹 Performing full NVS erase...");
  esp_err_t err = nvs_flash_erase();   // Erase all NVS data (Wi-Fi + Preferences)
  if (err == ESP_OK) {
    Serial.println("✅ NVS successfully erased.");
  } else {
    Serial.printf("⚠️ NVS erase failed: %s\n", esp_err_to_name(err));
  }
  delay(500);
  // Re-init NVS so Wi-Fi stack can work again after erase
  nvs_flash_init();
}

void clearWiFiDriverConfig() {
  Serial.println("🧼 Clearing WiFi driver config...");
  wifi_config_t empty_conf;
  memset(&empty_conf, 0, sizeof(empty_conf));
  esp_wifi_set_mode(WIFI_MODE_STA);
  esp_wifi_set_config(WIFI_IF_STA, &empty_conf);
  esp_wifi_disconnect();
  WiFi.mode(WIFI_MODE_NULL);
  Serial.println("WiFi driver config cleared.");
}

void setup() {
  Serial.begin(115200);
  delay(1000);

  clearAllNVS();
  clearWiFiDriverConfig();

  Serial.println("Verifying...");
  WiFi.begin();
  delay(5000);

  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("✅ No saved WiFi credentials — device is clean.");
  } else {
    Serial.println("⚠️ Still connected somehow — check for custom credential code.");
  }

  Serial.println("Rebooting...");
  delay(2000);
  ESP.restart();
}

void loop() {}
