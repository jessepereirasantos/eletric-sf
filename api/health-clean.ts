import { VercelRequest, VercelResponse } from '@vercel/node';
import express from 'express';

export default function handler(_req: VercelRequest, res: VercelResponse) {
  res.status(200).json({
    status: 'ok',
    message: 'Express importado com sucesso!',
    expressVersion: typeof express === 'function' ? 'loaded' : 'undefined'
  });
}
