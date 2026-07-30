import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
config();

const __filename__ = fileURLToPath(import.meta.url);
const __dirname__ = path.dirname(__filename__);

config({ path: path.join(__dirname__, '../../../.env') });

export const env = {
    PORT: parseInt(process.env.PORT || ''),
    REDIS_URL: process.env.REDIS_URL,
    RABBITMQ_URL: process.env.RABBITMQ_URL,
    NODE_ENV: process.env.NODE_ENV,
    LOG_LEVEL: process.env.LOG_LEVEL,
    HOSTNAME: process.env.HOSTNAME,
};
