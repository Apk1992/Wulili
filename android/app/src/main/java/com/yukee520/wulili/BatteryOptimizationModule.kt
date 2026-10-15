package com.yukee520.wulili

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.PowerManager
import android.provider.Settings
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class BatteryOptimizationModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "BatteryOptimization"

    @ReactMethod
    fun isIgnoringBatteryOptimizations(promise: Promise) {
        try {
            val powerManager = reactApplicationContext
                .getSystemService(Context.POWER_SERVICE) as PowerManager
            val result = if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.M) {
                powerManager.isIgnoringBatteryOptimizations(reactApplicationContext.packageName)
            } else {
                true
            }
            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject("BATTERY_CHECK_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun requestIgnoreBatteryOptimizations(promise: Promise) {
        try {
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.M) {
                val powerManager = reactApplicationContext
                    .getSystemService(Context.POWER_SERVICE) as PowerManager
                val packageName = reactApplicationContext.packageName

                if (powerManager.isIgnoringBatteryOptimizations(packageName)) {
                    promise.resolve(true)
                    return
                }

                val intent = Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS).apply {
                    data = Uri.parse("package:$packageName")
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }

                if (intent.resolveActivity(reactApplicationContext.packageManager) != null) {
                    reactApplicationContext.startActivity(intent)
                    // 由于是异步的，先返回 true 让 JS 知道弹窗已打开
                    promise.resolve(true)
                } else {
                    // 有些设备不支持 REQUEST_IGNORE，跳转到应用详情页
                    val fallbackIntent = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
                        data = Uri.parse("package:$packageName")
                        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    }
                    reactApplicationContext.startActivity(fallbackIntent)
                    promise.resolve(false)
                }
            } else {
                promise.resolve(true)
            }
        } catch (e: Exception) {
            promise.reject("BATTERY_REQUEST_ERROR", e.message, e)
        }
    }
}