import { env } from '@shipu/config/env';
import { connectionToRabbitMQ } from '@shipu/rabbitmq/rabbitmq';
import { connectToRedis } from '@shipu/redis/redis';

import app from './index.ts';
import { logger } from './lib/logger.ts';

const log = logger.child({ module: 'backend-connection' });

const PORT = env.PORT;

app.listen(PORT, async () => {
    await connectionToRabbitMQ();
    await connectToRedis();
    log.info(`App is running on ${PORT}`);
});
