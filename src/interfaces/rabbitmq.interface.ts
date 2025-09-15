export interface RabbitMQConfig {
  url: string;
  queue?: string;
  exchange?: string;
  routingKey?: string;
  exchangeType?: 'direct' | 'topic' | 'fanout' | 'headers';
  durable?: boolean;
  persistent?: boolean;
  prefetch?: number;
}

export interface MessageOptions {
  queue?: string;
  exchange?: string;
  routingKey?: string;
  persistent?: boolean;
  priority?: number;
  expiration?: string;
  headers?: Record<string, any>;
}

export interface QueueOptions {
  durable?: boolean;
  exclusive?: boolean;
  autoDelete?: boolean;
  arguments?: Record<string, any>;
}

export interface ExchangeOptions {
  type: 'direct' | 'topic' | 'fanout' | 'headers';
  durable?: boolean;
  autoDelete?: boolean;
  internal?: boolean;
  arguments?: Record<string, any>;
}

export interface ConsumeOptions {
  noAck?: boolean;
  exclusive?: boolean;
  priority?: number;
  consumerTag?: string;
  noLocal?: boolean;
  arguments?: Record<string, any>;
}

export interface MessageHandler {
  (message: any, ack: () => void, nack: (requeue?: boolean) => void): Promise<void> | void;
}