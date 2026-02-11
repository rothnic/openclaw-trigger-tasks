import { schedules, logger } from "@trigger.dev/sdk";
import { healthCheck, gatewayDoctor } from "./monitoring";

export const hourlyHealthCheck = schedules.task({
  id: "hourly-health-check",
  cron: "0 * * * *",
  run: async (payload) => {
    logger.info("Running hourly health check", {
      timestamp: payload.timestamp,
      lastRun: payload.lastTimestamp,
    });
    
    const result = await healthCheck.triggerAndWait({});
    
    if (!result.ok) {
      logger.error("Health check failed", { error: result.error });
      return { status: "failed", error: result.error };
    }
    
    return {
      status: "completed",
      healthStatus: result.output.status,
      timestamp: new Date().toISOString(),
    };
  },
});

export const dailyDoctorCheck = schedules.task({
  id: "daily-doctor-check",
  cron: "0 6 * * *", // 6 AM UTC (midnight CST)
  run: async (payload) => {
    logger.info("Running daily doctor check", {
      timestamp: payload.timestamp,
    });
    
    const result = await gatewayDoctor.triggerAndWait({});
    
    if (!result.ok) {
      logger.error("Doctor check failed", { error: result.error });
      return { status: "failed", error: result.error };
    }
    
    if (!result.output.healthy) {
      logger.warn("Gateway has issues", { issues: result.output.issues });
    }
    
    return {
      status: "completed",
      healthy: result.output.healthy,
      issues: result.output.issues,
      timestamp: new Date().toISOString(),
    };
  },
});
