import { task, logger } from "@trigger.dev/sdk";

interface BackupPayload {
  service: "clawdbot" | "trigger" | "searxng";
  destination?: string;
}

export const serviceBackup = task({
  id: "service-backup",
  maxDuration: 600,
  retry: {
    maxAttempts: 2,
    minTimeoutInMs: 10000,
    maxTimeoutInMs: 60000,
    factor: 2,
  },
  run: async (payload: BackupPayload) => {
    const { service, destination = "local" } = payload;
    const sourcePath = `/srv/apps/${service}/`;
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupName = `${service}-backup-${timestamp}`;
    
    logger.info("Starting backup", { service, sourcePath, destination });
    
    // Placeholder - actual backup implementation would use SSH/rsync
    // For now, just log the intent
    const backupInfo = {
      service,
      sourcePath,
      backupName,
      destination,
      timestamp: new Date().toISOString(),
      status: "simulated",
    };
    
    logger.info("Backup completed", backupInfo);
    
    return backupInfo;
  },
});

export const databaseBackup = task({
  id: "database-backup",
  maxDuration: 300,
  retry: {
    maxAttempts: 3,
    minTimeoutInMs: 5000,
    maxTimeoutInMs: 30000,
    factor: 2,
  },
  run: async (payload: { database: string; format?: "sql" | "custom" }) => {
    const { database, format = "custom" } = payload;
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    
    logger.info("Starting database backup", { database, format });
    
    // Placeholder for pg_dump execution
    const backupInfo = {
      database,
      format,
      filename: `${database}-${timestamp}.${format === "sql" ? "sql" : "dump"}`,
      timestamp: new Date().toISOString(),
      status: "simulated",
    };
    
    logger.info("Database backup completed", backupInfo);
    
    return backupInfo;
  },
});
