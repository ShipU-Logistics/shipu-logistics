import { QueueMessage } from '@shipu/types-config/types';

import { getChannel, logger } from './index.ts';

const log = logger.child({ module: 'rabbitmq-helper' });

/**
 * RabbitMQ queue helper.
 *
 * Provides a high-level abstraction for publishing messages to queues and consuming them with automatic acknowledgements, structured, logging and error handling
 */
export const queue = {
    /**
     * Publishes a message to a RabbitMQ queue.
     *
     * The target queue is declared before publishing to ensure it exists.
     * Messages are marked as persistent so RabbitMQ can retain them across broker restarts when supported by the queue configuration.
     *
     * @param queueName - Destination queue.
     * @param message - Message payload.
     * @returns - True if RabbitMQ accepted the message into its internal buffer.
     */
    async publish(queueName: string, message: QueueMessage): Promise<boolean> {
        try {
            const channel = getChannel();

            /**
             * Ensure the queue exists before publishing.
             *
             * Declaring an existing queue is safe because RabbitMQ treats it as an idempotent operation.
             */
            await channel.assertQueue(queueName, { durable: true });

            /**
             * Publish the serialized message.
             *
             * Persistent message improve durability by allowing the broker to write them to disk when possible.
             */
            const sent = channel.sendToQueue(queueName, Buffer.from(JSON.stringify(message)), {
                persistent: true,
            });

            /**
             * A false return value indicates the channel's internal write buffer is full. Messages are still queued internally, but publishers should consider waiting for the "drain" event before sending additional messages.
             */
            if (!sent) {
                log.error(
                    'sendToQueue returned false - internal buffer full, consider waiting for "drain"',
                );
            }

            return sent;
        } catch (error) {
            log.error({ error }, 'Failed to publish to queue');
            return false;
        }
    },

    /**
     * Registers a consumer for a RabbitMQ queue.
     *
     * Message are processed one at a time by the supplied callback.
     * Successful processing acknowledges the message, while failure reject it to prevent invalid or failed messages from remaining unacknowledged indefinitely.
     *
     * @param queueName - Queue to consume.
     * @param callback - Business logic executed for each message.
     * @param options - Optional consumer configuration.
     */
    async consume(
        queueName: string,
        callback: (message: QueueMessage) => Promise<void>,
        options?: { prefetch?: number },
    ): Promise<void> {
        try {
            const channel = getChannel();

            // Ensure the queue exists before registering the consumer.
            await channel.assertQueue(queueName, { durable: true });

            /**
             * Limit the number of unacknowledged messages delivered simultaneously to this consumer.
             *
             * This provides backpressure and prevents a from receiving more work than it can process.
             */
            if (options?.prefetch) {
                channel.prefetch(options.prefetch);
            }

            await channel.consume(
                queueName,
                async (msg) => {
                    if (!msg) return;

                    let content: QueueMessage;

                    /**'
                     * Deserialize the incoming message.
                     *
                     * Invalid JSON is treated as a poison message and is permanently rejected to prevent infinite retries.
                     */
                    try {
                        content = JSON.parse(msg.content.toString());
                    } catch (parseError) {
                        log.error(
                            { error: parseError },
                            'Failed to parse message - discarding (poison message)',
                        );
                        channel.nack(msg, false, false);
                        return;
                    }

                    try {
                        // Execute the application-specific processing logic.
                        await callback(content);

                        // Acknowledge successful processing so RabbitMQ can permanently remove the message from the queue.
                        channel.ack(msg);
                    } catch (processingError) {
                        log.error(
                            { error: processingError, messageId: msg.properties.messageId },
                            'Error processing messsage - requeueing for retry',
                        );

                        /**
                         * Reject the message without requeueing.
                         *
                         * This prevents continuously failing message from creating an infinite processing loop.
                         * Dead Letter Queues (DLQs) should be configured for production retry handling.
                         */
                        channel.nack(msg, false, false);
                    }
                },

                // Manual acknowledgements ensure message are only removed after successful processing.
                { noAck: false },
            );

            log.info({ prefetch: options?.prefetch }, 'Consumer registered');
        } catch (error) {
            log.error({ error }, 'Failed to consume from queue');
            throw error;
        }
    },
};
