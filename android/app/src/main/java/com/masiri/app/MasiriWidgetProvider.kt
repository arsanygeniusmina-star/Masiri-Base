package com.masiri.app

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.widget.RemoteViews
import com.masiri.app.R

/**
 * Home screen widget for THE APOSTLES app.
 * Displays the reading streak and opens the app when tapped.
 */
class MasiriWidgetProvider : AppWidgetProvider() {

    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        for (appWidgetId in appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId)
        }
    }

    override fun onEnabled(context: Context) {
        // Widget first added to home screen
        super.onEnabled(context)
    }

    override fun onDeleted(
        context: Context,
        appWidgetIds: IntArray
    ) {
        super.onDeleted(context, appWidgetIds)
    }

    override fun onDisabled(context: Context) {
        // Last widget removed from home screen
        super.onDisabled(context)
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)
        when (intent.action) {
            "com.masiri.app.action.REFRESH_WIDGET" -> {
                val appWidgetManager = AppWidgetManager.getInstance(context)
                val componentName = android.content.ComponentName(context, MasiriWidgetProvider::class.java)
                val appWidgetIds = appWidgetManager.getAppWidgetIds(componentName)
                appWidgetIds.forEach { appWidgetId ->
                    updateAppWidget(context, appWidgetManager, appWidgetId)
                }
            }
        }
    }

    private fun updateAppWidget(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetId: Int
    ) {
        val views = RemoteViews(context.packageName, R.layout.widget_layout)

        // Set tap action to open the app
        val launchIntent = Intent(context, MainActivity::class.java)
        launchIntent.action = "com.masiri.app.action.OPEN_FROM_WIDGET"
        launchIntent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
        val pendingIntent = android.app.PendingIntent.getActivity(
            context,
            appWidgetId,
            launchIntent,
            android.app.PendingIntent.FLAG_UPDATE_CURRENT or android.app.PendingIntent.FLAG_IMMUTABLE
        )
        views.setOnClickPendingIntent(R.id.container, pendingIntent)

        // Set the streak text (static default - can be updated via broadcast)
        views.setTextViewText(R.id.widget_streak, "سلسلة القراءة: 0 يوم")

        appWidgetManager.updateAppWidget(appWidgetId, views)
    }

    companion object {
        const val ACTION_REFRESH_WIDGET = "com.masiri.app.action.REFRESH_WIDGET"
    }
}
