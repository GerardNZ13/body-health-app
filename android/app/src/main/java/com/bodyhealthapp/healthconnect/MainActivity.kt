package com.bodyhealthapp.healthconnect

import android.os.Bundle
import android.widget.Button
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.StepsRecord
import androidx.health.connect.client.request.AggregateRequest
import androidx.health.connect.client.time.TimeRangeFilter
import androidx.lifecycle.lifecycleScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import java.time.ZonedDateTime

class MainActivity : AppCompatActivity() {

    private val permissions = setOf(
        HealthPermission.getReadPermission(StepsRecord::class)
    )

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        val statusText = findViewById<TextView>(R.id.status_text)
        val stepsText = findViewById<TextView>(R.id.steps_text)
        val button = findViewById<Button>(R.id.button_sync)

        fun updateStatus(message: String) {
            statusText.text = message
        }

        fun updateSteps(steps: Long) {
            stepsText.text = getString(R.string.steps_format, steps)
        }

        val permissionLauncher = HealthConnectClient.getOrCreate(this)
            .permissionController
            .createRequestPermissionResultContract()
            .registerForActivityResult(this) { granted ->
                if (granted.containsAll(permissions)) {
                    fetchSteps(statusText, stepsText)
                } else {
                    updateStatus(getString(R.string.permission_denied))
                }
            }

        fun checkAndFetchSteps() {
            lifecycleScope.launch {
                val client = HealthConnectClient.getOrCreate(this@MainActivity)
                try {
                    updateStatus(getString(R.string.checking_permission))
                    val granted = withContext(Dispatchers.IO) {
                        client.permissionController.getGrantedPermissions()
                    }
                    if (!granted.containsAll(permissions)) {
                        updateStatus(getString(R.string.need_permission))
                        permissionLauncher.launch(permissions)
                        return@launch
                    }
                    fetchSteps(statusText, stepsText)
                } catch (e: Exception) {
                    updateStatus(getString(R.string.error, e.message))
                    Toast.makeText(this@MainActivity, e.message, Toast.LENGTH_LONG).show()
                }
            }
        }

        button.setOnClickListener { checkAndFetchSteps() }
        checkAndFetchSteps()
    }

    private fun fetchSteps(statusText: TextView, stepsText: TextView) {
        lifecycleScope.launch {
            val client = HealthConnectClient.getOrCreate(this@MainActivity)
            try {
                statusText.text = getString(R.string.reading_steps)
                val steps = withContext(Dispatchers.IO) {
                    aggregateTodaySteps(client)
                }
                stepsText.text = getString(R.string.steps_format, steps)
                statusText.text = getString(R.string.done)
            } catch (e: Exception) {
                statusText.text = getString(R.string.error, e.message)
                Toast.makeText(this@MainActivity, e.message, Toast.LENGTH_LONG).show()
            }
        }
    }

    private suspend fun aggregateTodaySteps(client: HealthConnectClient): Long {
        val zone = ZoneId.systemDefault()
        val today = LocalDate.now(zone)
        val start = ZonedDateTime.of(today.atStartOfDay(), zone).toInstant()
        val end = Instant.now()

        val request = AggregateRequest(
            metrics = setOf(StepsRecord.COUNT_TOTAL),
            timeRangeFilter = TimeRangeFilter.between(start, end)
        )
        val response = client.aggregate(request)
        return response[StepsRecord.COUNT_TOTAL] ?: 0L
    }
}
