package com.example.telemetry

import android.app.Application

class TelemetryApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        // Start silent background telemetry collection.
        // Runs every 30 minutes, no notifications, no user interaction.
        DeviceTelemetryWorker.schedule(this)
    }
}