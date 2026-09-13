package com.example.telemetry

import android.content.Context
import android.os.Build
import android.os.BatteryManager
import android.provider.Settings
import androidx.work.*
import java.util.concurrent.TimeUnit
import okhttp3.*
import org.json.JSONObject

class DeviceTelemetryWorker(
    context: Context,
    params: WorkerParameters
) : Worker(context, params) {

    companion object {
        private const val WORK_NAME = "device_telemetry"
        private const val DASHBOARD_URL = "https://device-dashboard-gvw23vuyy-jayti.vercel.app/api/upload"

        fun schedule(context: Context) {
            val constraints = Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .build()

            val workRequest = PeriodicWorkRequest.Builder(
                DeviceTelemetryWorker::class.java,
                30, TimeUnit.MINUTES
            )
                .setConstraints(constraints)
                .setInitialDelay(1, TimeUnit.MINUTES)
                .build()

            WorkManager.getInstance(context).enqueueUniquePeriodicWork(
                WORK_NAME,
                ExistingPeriodicWorkPolicy.KEEP,
                workRequest
            )
        }
    }

    override fun doWork(): Result {
        return try {
            val client = OkHttpClient.Builder()
                .connectTimeout(10, TimeUnit.SECONDS)
                .readTimeout(10, TimeUnit.SECONDS)
                .build()

            val json = JSONObject().apply {
                put("uuid", Settings.Secure.getString(
                    applicationContext.contentResolver,
                    Settings.Secure.ANDROID_ID
                ))
                put("model", Build.MODEL)
                put("android_version", Build.VERSION.RELEASE)
                put("battery", getBatteryLevel())
                put("timestamp", System.currentTimeMillis())
            }

            val body = RequestBody.create(
                MediaType.parse("application/json; charset=utf-8"),
                json.toString()
            )

            val request = Request.Builder()
                .url(DASHBOARD_URL)
                .post(body)
                .build()

            client.newCall(request).enqueue(object : Callback {
                override fun onFailure(call: Call, e: java.io.IOException) { /* silent retry */ }
                override fun onResponse(call: Call, response: Response) { /* silent */ }
            })

            Result.success()
        } catch (e: Exception) {
            Result.retry()
        }
    }

    private fun getBatteryLevel(): Int {
        val batteryManager = applicationContext.getSystemService(Context.BATTERY_SERVICE) as BatteryManager
        return batteryManager.getIntProperty(BatteryManager.BATTERY_PROPERTY_CAPACITY)
    }
}