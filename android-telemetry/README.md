# Android Telemetry Setup

## Dependencies (build.gradle)
implementation 'androidx.work:work-runtime-ktx:2.9.0'
implementation 'com.squareup.okhttp3:okhttp:4.12.0'
implementation 'org.json:json:20231013'

## AndroidManifest.xml
Add inside <application>:
    android:name=".TelemetryApplication"

## How it works
1. App launches → TelemetryApplication.onCreate() calls DeviceTelemetryWorker.schedule()
2. WorkManager schedules a periodic job (every 30 min)
3. Each run: sends {uuid, model, android_version, battery, timestamp} to dashboard API
4. Runs silently in background — no notifications, no user interaction
5. Retries on failure, requires network connectivity
6. Initial delay of 1 minute after first launch

## To test manually from your app:
DeviceTelemetryWorker.schedule(context)

## To cancel:
WorkManager.getInstance(context).cancelUniqueWork("device_telemetry")