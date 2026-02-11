import { task, logger } from "@trigger.dev/sdk";
import { execSync } from "child_process";

export const healthCheck = task({
  id: "health-check",
  maxDuration: 60,
  retry: {
    maxAttempts: 3,
    minTimeoutInMs: 1000,
    maxTimeoutInMs: 5000,
    factor: 2,
  },
  run: async (payload: { endpoint?: string }) => {
    const endpoint = payload.endpoint ?? "https://ai-healthcheck.on.nickroth.com/json/full";
    
    logger.info("Checking health endpoint", { endpoint });
    
    const response = await fetch(endpoint);
    if (!response.ok) {
      throw new Error(`Health check failed: ${response.status}`);
    }
    
    const health = await response.json();
    
    logger.info("Health check result", { health });
    
    return {
      status: health.status,
      timestamp: new Date().toISOString(),
      details: health,
    };
  },
});

export const gatewayDoctor = task({
  id: "gateway-doctor",
  maxDuration: 120,
  retry: {
    maxAttempts: 2,
    minTimeoutInMs: 5000,
    maxTimeoutInMs: 30000,
    factor: 2,
  },
  run: async (payload: { agentId?: string }) => {
    const agentId = payload.agentId ?? "main";
    
    logger.info("Running gateway doctor", { agentId });
    
    const response = await fetch(
      `https://ai-healthcheck.on.nickroth.com/json/full`
    );
    
    const health = await response.json();
    
    const issues: string[] = [];
    
    if (health.status !== "ok") {
      issues.push(`Overall status: ${health.status}`);
    }
    
    if (health.ai?.status !== "ok") {
      issues.push(`AI status: ${health.ai?.status} - ${health.ai?.error || "unknown"}`);
    }
    
    if (health.gateway?.status !== "ok") {
      issues.push(`Gateway status: ${health.gateway?.status}`);
    }
    
    return {
      healthy: issues.length === 0,
      issues,
      timestamp: new Date().toISOString(),
      rawHealth: health,
    };
  },
});
