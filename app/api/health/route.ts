import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";
import type { HealthStatus, SourceHealth } from "@/lib/types";

export async function GET() {
  try {
    // Check database connectivity
    const { error: dbError } = await supabase
      .from("jobs")
      .select("id")
      .limit(1);

    if (dbError) {
      return NextResponse.json(
        {
          status: "unhealthy",
          error: "Database connection failed",
          timestamp: new Date().toISOString(),
        },
        { status: 503 }
      );
    }

    // Get scrape logs from last 24 hours
    const { data: recentScrapes, error: logError } = await supabase
      .from("scrape_logs")
      .select("*")
      .gte(
        "timestamp",
        new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      )
      .order("timestamp", { ascending: false });

    if (logError) {
      console.error("Error fetching scrape logs:", logError);
    }

    const sources = ["greenhouse", "lever", "ashby"];
    const sourceHealthStats: SourceHealth[] = sources.map((source) => {
      const logs = (recentScrapes || []).filter((log) => log.source === source);

      if (logs.length === 0) {
        return {
          source,
          status: "unhealthy" as const,
          lastSuccess: undefined,
          failureRate: 1,
        };
      }

      const successLogs = logs.filter((log) => log.status === "success");
      const failedLogs = logs.filter((log) => log.status === "failed");
      const failureRate = failedLogs.length / logs.length;

      const lastSuccess = successLogs[0]?.timestamp;
      const avgDuration =
        successLogs.length > 0
          ? successLogs.reduce((sum, log) => sum + (log.duration_ms || 0), 0) /
            successLogs.length
          : undefined;

      return {
        source,
        status: failureRate < 0.5 ? ("healthy" as const) : ("unhealthy" as const),
        lastSuccess,
        failureRate,
        avgDuration,
      };
    });

    const overallHealthy = sourceHealthStats.every(
      (h) => h.status === "healthy"
    );
    const overallStatus: HealthStatus["status"] = overallHealthy
      ? "healthy"
      : sourceHealthStats.some((h) => h.status === "healthy")
      ? "degraded"
      : "unhealthy";

    const response: HealthStatus = {
      status: overallStatus,
      sources: sourceHealthStats,
      timestamp: new Date().toISOString(),
    };

    const statusCode = overallStatus === "healthy" ? 200 : 503;

    return NextResponse.json(response, { status: statusCode });
  } catch (error) {
    console.error("Health check error:", error);
    return NextResponse.json(
      {
        status: "unhealthy",
        error: "Health check failed",
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
