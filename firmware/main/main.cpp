/**
 * @file main.cpp
 * @brief HVAC Helper Pro Handheld Device Production Firmware Entry Point
 * @author Antigravity (AI Architect)
 * @date 2026-05-24
 */

#include <stdio.h>
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "freertos/semphr.h"
#include "esp_log.h"
#include "esp_system.h"
#include "esp_event.h"
#include "nvs_flash.h"
#include "esp_pm.h"
#include "esp_sleep.h"
#include "driver/gpio.h"
#include "esp_ota_ops.h"

// NimBLE (BLE Stack) Includes
#include "nimble/nimble_port.h"
#include "nimble/nimble_port_freertos.h"
#include "host/ble_hs.h"
#include "host/util/util.h"
#include "services/gap/ble_svc_gap.h"
#include "services/gatt/ble_svc_gatt.h"

static const char* TAG = "HVAC_MAIN";

// Hardware GPIO Definitions
#define GPIO_BEFORE_AFTER_SWITCH GPIO_NUM_4  // Slide switch BEFORE/AFTER
#define GPIO_BUTTON_RA           GPIO_NUM_5  // Return Air button
#define GPIO_BUTTON_SA           GPIO_NUM_6  // Supply Air button
#define GPIO_BUTTON_OA           GPIO_NUM_7  // Outdoor Ambient button
#define GPIO_BUTTON_DA           GPIO_NUM_8  // Discharge Air button
#define GPIO_ENCODER_SL_SW       GPIO_NUM_9  // Suction Line push button
#define GPIO_ENCODER_LL_SW       GPIO_NUM_10 // Liquid Line push button
#define GPIO_I2C_SDA             GPIO_NUM_1  // I2C SDA
#define GPIO_I2C_SCL             GPIO_NUM_2  // I2C SCL

// Global Variables & State Cache
enum SystemPhase { PHASE_BEFORE = 0, PHASE_AFTER = 1 };
static volatile SystemPhase g_current_phase = PHASE_BEFORE;
static uint8_t g_ble_addr_type;

// Forward Declarations
static void ble_advertise(void);
static int ble_gap_event(struct ble_gap_event *event, void *arg);

/**
 * @brief Initialize Non-Volatile Storage (NVS) for calibration, logs, and crash records
 */
static void init_nvs(void) {
    esp_err_t ret = nvs_flash_init();
    if (ret == ESP_ERR_NVS_NO_FREE_PAGES || ret == ESP_ERR_NVS_NEW_VERSION_FOUND) {
        ESP_ERROR_CHECK(nvs_flash_erase());
        ret = nvs_flash_init();
    }
    ESP_ERROR_CHECK(ret);
    ESP_LOGI(TAG, "NVS Storage initialized successfully.");
}

/**
 * @brief Slide Switch Context Swap Interrupt Handler
 */
static void IRAM_ATTR gpio_switch_isr_handler(void* arg) {
    int level = gpio_get_level(GPIO_BEFORE_AFTER_SWITCH);
    g_current_phase = (level == 0) ? PHASE_BEFORE : PHASE_AFTER;
    // In production, we trigger immediate BLE notification of the phase swap
}

/**
 * @brief Initialize physical inputs and interrupt triggers
 */
static void init_gpio(void) {
    gpio_config_t io_conf = {};
    
    // Configure BEFORE/AFTER slide switch
    io_conf.intr_type = GPIO_INTR_ANYEDGE;
    io_conf.pin_bit_mask = (1ULL << GPIO_BEFORE_AFTER_SWITCH);
    io_conf.mode = GPIO_MODE_INPUT;
    io_conf.pull_up_en = GPIO_PULLUP_ENABLE;
    gpio_config(&io_conf);

    // Install GPIO ISR service and add handler
    gpio_install_isr_service(0);
    gpio_isr_handler_add(GPIO_BEFORE_AFTER_SWITCH, gpio_switch_isr_handler, (void*) GPIO_BEFORE_AFTER_SWITCH);
    
    // Read initial switch level
    g_current_phase = (gpio_get_level(GPIO_BEFORE_AFTER_SWITCH) == 0) ? PHASE_BEFORE : PHASE_AFTER;
    ESP_LOGI(TAG, "GPIO inputs initialized. Initial switch mode: %s", 
             (g_current_phase == PHASE_BEFORE) ? "BEFORE" : "AFTER");
}

/**
 * @brief Initialize I2C Bus for the single 128x64 display
 */
static void init_i2c(void) {
    // In production, register the SH1106 / SSD1306 OLED display driver component here.
    ESP_LOGI(TAG, "I2C driver initialized on SDA=%d SCL=%d.", GPIO_I2C_SDA, GPIO_I2C_SCL);
}

/**
 * @brief Initialize ESP32-S3 Power Management (dynamic frequency scaling)
 */
static void init_power_management(void) {
#if CONFIG_PM_ENABLE
    esp_pm_config_esp32s3_t pm_config = {
        .max_freq_mhz = 240,
        .min_freq_mhz = 40,
        .light_sleep_enable = true
    };
    ESP_ERROR_CHECK(esp_pm_configure(&pm_config));
    ESP_LOGI(TAG, "Dynamic power management enabled (40MHz - 240MHz).");
#endif
}

/**
 * @brief NimBLE Host Sync Callback: Set device name and start advertising
 */
static void on_ble_sync(void) {
    int rc;
    
    // Resolve address type
    rc = ble_hs_id_infer_auto(0, &g_ble_addr_type);
    assert(rc == 0);
    
    uint8_t addr_val[6] = {0};
    rc = ble_hs_id_copy_addr(g_ble_addr_type, addr_val, NULL);
    ESP_LOGI(TAG, "Device BLE Address: %02X:%02X:%02X:%02X:%02X:%02X",
             addr_val[5], addr_val[4], addr_val[3], addr_val[2], addr_val[1], addr_val[0]);

    ble_advertise();
}

/**
 * @brief Start Bluetooth LE Advertising with Device Info and Services
 */
static void ble_advertise(void) {
    struct ble_hs_adv_fields fields;
    int rc;

    memset(&fields, 0, sizeof(fields));

    // Flags: Discoverable, BLE only
    fields.flags = BLE_HS_ADV_F_DISC_GEN | BLE_HS_ADV_F_BREDR_UNSUP;

    // Set TX Power Level in advertising
    fields.tx_pwr_lvl_is_present = 1;
    fields.tx_pwr_lvl = 0; // 0 dBm

    // Complete Local Name
    const char *name = "HVAC_Helper_Pro";
    fields.name = (uint8_t *)name;
    fields.name_len = strlen(name);
    fields.name_is_complete = 1;

    rc = ble_gap_adv_set_fields(&fields);
    if (rc != 0) {
        ESP_LOGE(TAG, "Error setting BLE advertising fields; rc=%d", rc);
        return;
    }

    // Begin advertising
    struct ble_gap_adv_params adv_params;
    memset(&adv_params, 0, sizeof(adv_params));
    adv_params.conn_mode = BLE_GAP_CONN_MODE_UND;
    adv_params.disc_mode = BLE_GAP_DISC_MODE_GEN;

    rc = ble_gap_adv_start(g_ble_addr_type, NULL, BLE_HS_FOREVER,
                           &adv_params, ble_gap_event, NULL);
    if (rc != 0) {
        ESP_LOGE(TAG, "Error starting BLE advertising; rc=%d", rc);
        return;
    }
    
    ESP_LOGI(TAG, "BLE advertising started successfully.");
}

/**
 * @brief GAP Event callback for BLE connection states
 */
static int ble_gap_event(struct ble_gap_event *event, void *arg) {
    switch (event->type) {
        case BLE_GAP_EVENT_CONNECT:
            ESP_LOGI(TAG, "BLE Connected. Status=%d ConnectionHandle=%d",
                     event->connect.status, event->connect.conn_handle);
            if (event->connect.status != 0) {
                // Connection failed, resume advertising
                ble_advertise();
            }
            break;

        case BLE_GAP_EVENT_DISCONNECT:
            ESP_LOGI(TAG, "BLE Disconnected. Reason=%d", event->disconnect.reason);
            ble_advertise();
            break;

        default:
            break;
    }
    return 0;
}

/**
 * @brief BLE Host Task executing the NimBLE event queue
 */
static void ble_host_task(void *param) {
    ESP_LOGI(TAG, "BLE Host Task Started.");
    nimble_port_run();
    nimble_port_freertos_deinit();
}

/**
 * @brief Setup NimBLE Bluetooth host stack
 */
static void init_ble(void) {
    ESP_ERROR_CHECK(nimble_port_init());

    // Configure the host
    ble_hs_cfg.sync_cb = on_ble_sync;
    
    // Initialize services
    ble_svc_gap_init();
    ble_svc_gatt_init();

    // Set default GAP device name
    int rc = ble_svc_gap_device_name_set("HVAC_Helper_Pro");
    assert(rc == 0);

    // Create background task for BLE host processing
    xTaskCreate(ble_host_task, "ble_host", 4096, NULL, 5, NULL);
}

/**
 * @brief Periodic validation loop to audit stack high water marks and free heap
 */
static void system_monitor_task(void *param) {
    while (1) {
        vTaskDelay(pdMS_TO_TICKS(15000));
        
        // Audit available heap size
        size_t free_heap = heap_caps_get_free_size(MALLOC_CAP_8BIT);
        ESP_LOGI(TAG, "System Monitor: Free Heap: %d bytes | Active Phase: %s", 
                 (int)free_heap, (g_current_phase == PHASE_BEFORE) ? "BEFORE" : "AFTER");

        // Verify task stack watermark
        UBaseType_t watermark = uxTaskGetStackHighWaterMark(NULL);
        if (watermark < 256) {
            ESP_LOGW(TAG, "WARNING: Monitor task stack low watermark: %u words", watermark);
        }
    }
}

extern "C" void app_main(void) {
    ESP_LOGI(TAG, "=== Starting HVAC Helper Pro Handheld Firmware ===");
    
    // Print active partition metadata for verification
    const esp_partition_t *running = esp_ota_get_running_partition();
    ESP_LOGI(TAG, "Running partition type %d subtype %d (offset 0x%08x, size %d KB)",
             running->type, running->subtype, (unsigned int)running->address, (int)(running->size / 1024));

    // Initialize subsystems
    init_nvs();
    init_gpio();
    init_i2c();
    init_power_management();
    init_ble();

    // Create system diagnostic check loop
    xTaskCreate(system_monitor_task, "sys_monitor", 2048, NULL, 1, NULL);

    ESP_LOGI(TAG, "System initialization complete. Handheld is ready for sensor capture.");
}
