import { env } from '@shipu/config/env';
import { createLogger } from '@shipu/logger/service-logger';
import { connectionToRabbitMQ } from '@shipu/rabbitmq/rabbitmq';
import { connectToRedis } from '@shipu/redis/redis';

import app from './index.ts';

export const logger = createLogger('backend');

const PORT = env.PORT;

app.listen(PORT, async () => {
    await connectionToRabbitMQ();
    await connectToRedis();
    logger.info(`App is running on ${PORT}`);
});
