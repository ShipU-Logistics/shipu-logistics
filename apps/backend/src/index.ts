import express, { type Express, Request, Response } from 'express';

const app: Express = express();

app.get('/health-check', async (req: Request, res: Response) => {
    return res.json({
        message: 'Health check done, Backend running',
    });
});

export default app;
