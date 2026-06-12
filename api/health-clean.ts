import { VercelRequest, VercelResponse } from '@vercel/node';
import express from 'express';

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.status(200).json({
    status: 'ok',
    message: 'Express importado com sucesso!',
    expressVersion: express ? 'loaded' : 'undefined'
  });
}
