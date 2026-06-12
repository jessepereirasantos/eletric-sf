import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const importStatus: any = {
    timestamp: new Date().toISOString(),
    express: "pending",
    mysql2: "pending",
    bcryptjs: "pending",
    jsonwebtoken: "pending",
    localDatabase: "pending",
  };

  // Testa Express
  try {
    const express = await import('express');
    importStatus.express = "OK";
  } catch (err: any) {
    importStatus.express = "FAILED: " + err.message;
  }

  // Testa mysql2
  try {
    const mysql2 = await import('mysql2/promise');
    importStatus.mysql2 = "OK";
  } catch (err: any) {
    importStatus.mysql2 = "FAILED: " + err.message;
  }

  // Testa bcryptjs
  try {
    const bcryptjs = await import('bcryptjs');
    importStatus.bcryptjs = "OK";
  } catch (err: any) {
    importStatus.bcryptjs = "FAILED: " + err.message;
  }

  // Testa jsonwebtoken
  try {
    const jwt = await import('jsonwebtoken');
    importStatus.jsonwebtoken = "OK";
  } catch (err: any) {
    importStatus.jsonwebtoken = "FAILED: " + err.message;
  }

  // Testa o arquivo local database.ts
  try {
    const db = await import('../server/src/config/database');
    importStatus.localDatabase = "OK";
  } catch (err: any) {
    importStatus.localDatabase = "FAILED: " + err.message;
  }

  res.status(200).json(importStatus);
}
