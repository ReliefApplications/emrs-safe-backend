import amqp from 'amqplib/callback_api';
import { Application, Form, Record, Notification } from '../models';
import pubsub from './pubsub';

// Exchange used for the subscriptions to records.
const EXCHANGE = 'safe_subscriptions';

// Channel opened on first launch of the server, it will be used to add new queues if new subscriptions are created
let _channel: amqp.Channel;

export default function subscriberSafe() {
    amqp.connect(`amqp://${process.env.RABBITMQ_DEFAULT_USER}:${process.env.RABBITMQ_DEFAULT_PASS}@rabbitmq:5672?heartbeat=30`, (error0, connection) => {
        if (error0) {
            console.log('⏳ Waiting for rabbitmq server...');
            return setTimeout(subscriberSafe, 1000);
        }
        connection.createChannel(async (error1, channel) => {
            if (error1) {
                throw error1;
            }
            // Store the channel in a global variable to be used later on subscriptions addition
            _channel = channel;
            channel.assertExchange(EXCHANGE, 'topic', {
                durable: true
            });
            console.log('⏳ Waiting for messages of SAFE.');
            const routingKeys = (await Application.find({ subscriptions: { $exists: true, $not: { $size: 0 } } }, 'subscriptions.routingKey')).flatMap(x => x.subscriptions.map(y => y.routingKey));
            routingKeys.forEach(createAndConsumeQueue);
        })
    })
}

export function createAndConsumeQueue(routingKey: string): void {
    _channel.assertQueue(`${process.env.RABBITMQ_APPLICATION}.${routingKey}`, {
        exclusive: true
    }, (error2, q) => {
        if (error2) {
            throw error2;
        }
        _channel.bindQueue(q.queue, EXCHANGE, routingKey);
        _channel.consume(q.queue, async (msg) => {
            if (msg && msg.content) {
                const data = JSON.parse(msg.content.toString());
                const applications = await Application.find({ 'subscriptions.routingKey': msg.fields.routingKey }, 'subscriptions');
                applications.forEach(application => {
                    application.subscriptions.filter(x => x.routingKey === msg.fields.routingKey).forEach(async (subscription) => {
                        if (subscription.convertTo) {
                            const form = await Form.findById(subscription.convertTo);
                            if (form) {
                                const records = [];
                                const publisher = await pubsub();
                                if (Array.isArray(data)) {
                                    data.forEach(element => {
                                        records.push(new Record({
                                            form: subscription.convertTo,
                                            createdAt: new Date(),
                                            modifiedAt: new Date(),
                                            data: element.data,
                                            resource: form.resource ? form.resource : null
                                        }));
                                    });
                                } else {
                                    records.push(new Record({
                                        form: subscription.convertTo,
                                        createdAt: new Date(),
                                        modifiedAt: new Date(),
                                        data: data.data,
                                        resource: form.resource ? form.resource : null
                                    }));
                                }
                                Record.insertMany(records, {}, async () => {
                                    if (subscription.channel) {
                                        const notification = new Notification({
                                            action: `${records.length} ${form.name} created.`,
                                            content: '',
                                            createdAt: new Date(),
                                            channel: subscription.channel.toString(),
                                            seenBy: []
                                        });
                                        await notification.save();
                                        publisher.publish(subscription.channel.toString(), { notification });
                                    }
                                });
                            }
                        }
                    });
                });
            }
        }, {
            noAck: true
        });
    })
}

export function deleteQueue(routingKey: string): void{
    _channel.deleteQueue(`${process.env.RABBITMQ_APPLICATION}.${routingKey}`);
}
