import { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.status(200).json({
    status: 'ok',
    message: 'Servidor Serverless Vercel funcionando!',
    timestamp: new Date().toISOString(),
    env: {
      DB_HOST: process.env.DB_HOST,
      DB_USER: process.env.DB_USER,
      DB_NAME: process.env.DB_NAME,
      DB_PASS_DEFINED: !!process.env.DB_PASS,
      DB_PASS_LENGTH: process.env.DB_PASS ? process.env.DB_PASS.length : 0,
      VERCEL: process.env.VERCEL,
      NODE_ENV: process.env.NODE_ENV,
    }
  });
}
