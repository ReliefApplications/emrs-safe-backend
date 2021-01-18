import { AMQPPubSub } from 'graphql-amqp-subscriptions';
import amqp from 'amqplib';

let pubsub: AMQPPubSub;

// graphql_exchanges
export default async () => pubsub ? pubsub : await amqp.connect(`amqp://${process.env.RABBITMQ_DEFAULT_USER}:${process.env.RABBITMQ_DEFAULT_PASS}@rabbitmq:5672?heartbeat=30`)
.then(conn => {
  pubsub = new AMQPPubSub({
    connection: conn,
    exchange: {
      name: 'safe',
      type: 'fanout',
      options: {
        durable: true,
        autoDelete: false
      }
    },
    queue: {
      name: '',
      options: {
        durable: true,
        autoDelete: true
      },
      unbindOnDispose: false,
      deleteOnDispose: false,
    }
  });
  return pubsub;
});