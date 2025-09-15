import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { connect, Connection, Channel } from 'amqplib';
import {
  RabbitMQConfig,
  MessageOptions,
  QueueOptions,
  ExchangeOptions,
  ConsumeOptions,
  MessageHandler,
} from './interfaces/rabbitmq.interface';

export interface EventsConfig {
  rabbitmq?: RabbitMQConfig;
}

@Injectable()
export class EventsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EventsService.name);
  private connection: Connection | null = null;
  private channel: Channel | null = null;
  private config: EventsConfig;
  private rabbitMQEnabled = false;

  constructor(config?: EventsConfig) {
    this.config = config || {};
    this.rabbitMQEnabled = !!this.config.rabbitmq;
  }

  async onModuleInit(): Promise<void> {
    if (this.rabbitMQEnabled && this.config.rabbitmq) {
      await this.connectToRabbitMQ();
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.disconnect();
  }

  private async connectToRabbitMQ(): Promise<void> {
    if (!this.config.rabbitmq) return;

    try {
      this.connection = await connect(this.config.rabbitmq.url);
      this.channel = await this.connection.createChannel();
      
      if (this.config.rabbitmq.prefetch) {
        await this.channel.prefetch(this.config.rabbitmq.prefetch);
      }

      this.connection.on('error', (err) => {
        this.logger.error('RabbitMQ connection error:', err);
      });

      this.connection.on('close', () => {
        this.logger.warn('RabbitMQ connection closed');
      });

      this.logger.log('Connected to RabbitMQ successfully');
    } catch (error) {
      this.logger.error('Failed to connect to RabbitMQ:', error);
      throw error;
    }
  }

  private async disconnect(): Promise<void> {
    try {
      if (this.channel) {
        await this.channel.close();
        this.channel = null;
      }
      if (this.connection) {
        await this.connection.close();
        this.connection = null;
      }
      this.logger.log('Disconnected from RabbitMQ');
    } catch (error) {
      this.logger.error('Error disconnecting from RabbitMQ:', error);
    }
  }

  private async ensureConnection(): Promise<void> {
    if (!this.rabbitMQEnabled) {
      throw new Error('RabbitMQ is not configured');
    }
    if (!this.connection || !this.channel) {
      await this.connectToRabbitMQ();
    }
  }

  // Método principal para emitir eventos
  async emitEvent(eventName: string, data: any, options?: MessageOptions): Promise<void> {
    this.logger.log(`Event emitted: ${eventName}`);
    
    if (this.rabbitMQEnabled) {
      try {
        await this.sendToQueue(`events.${eventName}`, data, options);
      } catch (error) {
        this.logger.error(`Failed to send event ${eventName} to RabbitMQ:`, error);
        // No lanzamos el error para que la aplicación continúe funcionando
      }
    }
  }

  // Método para enviar mensajes a una cola específica
  async sendToQueue(queueName: string, message: any, options?: MessageOptions): Promise<boolean> {
    await this.ensureConnection();
    
    try {
      const messageBuffer = Buffer.from(JSON.stringify(message));
      const publishOptions = {
        persistent: options?.persistent ?? true,
        ...options,
      };

      return this.channel!.sendToQueue(queueName, messageBuffer, publishOptions);
    } catch (error) {
      this.logger.error(`Error sending message to queue ${queueName}:`, error);
      throw error;
    }
  }

  // Método para publicar mensajes a un exchange
  async publishToExchange(
    exchangeName: string,
    routingKey: string,
    message: any,
    options?: MessageOptions
  ): Promise<boolean> {
    await this.ensureConnection();
    
    try {
      const messageBuffer = Buffer.from(JSON.stringify(message));
      const publishOptions = {
        persistent: options?.persistent ?? true,
        ...options,
      };

      return this.channel!.publish(exchangeName, routingKey, messageBuffer, publishOptions);
    } catch (error) {
      this.logger.error(`Error publishing message to exchange ${exchangeName}:`, error);
      throw error;
    }
  }

  // Método para crear colas
  async createQueue(queueName: string, options?: QueueOptions): Promise<void> {
    await this.ensureConnection();
    
    const queueOptions = {
      durable: true,
      ...options,
    };

    await this.channel!.assertQueue(queueName, queueOptions);
  }

  // Método para crear exchanges
  async createExchange(exchangeName: string, options: ExchangeOptions): Promise<void> {
    await this.ensureConnection();
    
    const exchangeOptions = {
      durable: true,
      ...options,
    };

    await this.channel!.assertExchange(exchangeName, options.type, exchangeOptions);
  }

  // Método para consumir mensajes
  async consume(
    queueName: string,
    handler: MessageHandler,
    options?: ConsumeOptions
  ): Promise<string> {
    await this.ensureConnection();
    
    const consumeOptions = {
      noAck: false,
      ...options,
    };

    const result = await this.channel!.consume(queueName, (msg) => {
      if (msg) {
        try {
          const content = JSON.parse(msg.content.toString());
          const messageInfo = {
            content,
            fields: msg.fields,
            properties: msg.properties,
          };

          const ack = () => this.channel!.ack(msg);
          const nack = (requeue = false) => {
            if (requeue) {
              this.channel!.nack(msg, false, true);
            } else {
              this.channel!.reject(msg, false);
            }
          };
          handler(messageInfo, ack, nack);
        } catch (error) {
           this.logger.error('Error processing message:', error);
           this.channel!.reject(msg, false);
         }
      }
    }, consumeOptions);

    return result.consumerTag;
  }

  // Método para verificar si el servicio está conectado
  isConnected(): boolean {
    return this.rabbitMQEnabled && !!this.connection && !!this.channel;
  }

  // Método para verificar si RabbitMQ está habilitado
  isRabbitMQEnabled(): boolean {
    return this.rabbitMQEnabled;
  }
}
