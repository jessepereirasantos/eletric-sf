import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  const importStatus: Record<string, string> = {
    timestamp: new Date().toISOString(),
    express: "pending",
    mysql2: "pending",
    bcryptjs: "pending",
    jsonwebtoken: "pending",
    localDatabase: "pending",
  };

  try {
    await import('express');
    importStatus.express = "OK";
  } catch (err: any) {
    importStatus.express = "FAILED: " + err.message;
  }

  try {
    await import('mysql2/promise');
    importStatus.mysql2 = "OK";
  } catch (err: any) {
    importStatus.mysql2 = "FAILED: " + err.message;
  }

  try {
    await import('bcryptjs');
    importStatus.bcryptjs = "OK";
  } catch (err: any) {
    importStatus.bcryptjs = "FAILED: " + err.message;
  }

  try {
    await import('jsonwebtoken');
    importStatus.jsonwebtoken = "OK";
  } catch (err: any) {
    importStatus.jsonwebtoken = "FAILED: " + err.message;
  }

  try {
    await import('./config/database');
    importStatus.localDatabase = "OK";
  } catch (err: any) {
    importStatus.localDatabase = "FAILED: " + err.message;
  }

  res.status(200).json(importStatus);
}
