import { VercelRequest, VercelResponse } from '@vercel/node';
import mysql from 'mysql2/promise';

export default function handler(_req: VercelRequest, res: VercelResponse) {
  res.status(200).json({
    status: 'ok',
    message: 'mysql2 importado com sucesso!',
    mysqlVersion: typeof mysql === 'object' ? 'loaded' : 'undefined'
  });
}
