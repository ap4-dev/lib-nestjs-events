# NestJS Events Library

Una librería de eventos para NestJS con soporte opcional para RabbitMQ que proporciona una interfaz simple y potente para el manejo de mensajería asíncrona.

## Características

- ✅ Integración nativa con NestJS
- ✅ Soporte opcional para RabbitMQ
- ✅ Configuración flexible (síncrona y asíncrona)
- ✅ Interfaz única y consistente (EventsService)
- ✅ Manejo de colas y exchanges
- ✅ Consumo de mensajes con acknowledgments
- ✅ Gestión automática de conexiones
- ✅ Logging integrado
- ✅ TypeScript con tipado completo
- ✅ Fácil migración entre proveedores de mensajería

## Instalación

```bash
npm install @ap-dev/nestjs-events
```

## Configuración

### Configuración Básica (sin RabbitMQ)

```typescript
import { Module } from '@nestjs/common';
import { EventsModule } from '@ap-dev/nestjs-events';

@Module({
  imports: [
    EventsModule.forRoot(), // Sin configuración = solo logging local
  ],
})
export class AppModule {}
```

### Configuración con RabbitMQ

```typescript
import { Module } from '@nestjs/common';
import { EventsModule } from '@ap-dev/nestjs-events';

@Module({
  imports: [
    EventsModule.forRoot({
      rabbitmq: {
        url: 'amqp://localhost:5672',
        prefetch: 10,
      },
    }),
  ],
})
export class AppModule {}
```

### Configuración Asíncrona

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EventsModule } from '@ap-dev/nestjs-events';

@Module({
  imports: [
    ConfigModule.forRoot(),
    EventsModule.forRootAsync({
      useFactory: async (configService: ConfigService) => ({
        rabbitmq: {
          url: configService.get<string>('RABBITMQ_URL', 'amqp://localhost:5672'),
          prefetch: configService.get<number>('RABBITMQ_PREFETCH', 10),
        },
      }),
      inject: [ConfigService],
    }),
  ],
})
export class AppModule {}
```

## Uso

### Uso Básico

```typescript
import { Injectable } from '@nestjs/common';
import { EventsService } from '@ap-dev/nestjs-events';

@Injectable()
export class MyService {
  constructor(private readonly eventsService: EventsService) {}

  async sendUserCreatedEvent(user: any) {
    // Emite un evento (se enviará a RabbitMQ si está configurado)
    await this.eventsService.emitEvent('user.created', user);
  }

  async sendToSpecificQueue(data: any) {
    // Envía directamente a una cola específica
    await this.eventsService.sendToQueue('notifications', data);
  }

  async publishToExchange(data: any) {
    // Publica a un exchange con routing key
    await this.eventsService.publishToExchange('user-events', 'user.updated', data);
  }

  async checkConnection() {
    // Verifica si RabbitMQ está habilitado y conectado
    const isEnabled = this.eventsService.isRabbitMQEnabled();
    const isConnected = this.eventsService.isConnected();
    
    console.log(`RabbitMQ enabled: ${isEnabled}, connected: ${isConnected}`);
  }
}
```

### Configuración de Infraestructura

```typescript
import { Injectable, OnModuleInit } from '@nestjs/common';
import { EventsService } from '@ap-dev/nestjs-events';

@Injectable()
export class InfrastructureService implements OnModuleInit {
  constructor(private readonly eventsService: EventsService) {}

  async onModuleInit() {
    if (this.eventsService.isRabbitMQEnabled()) {
      await this.setupInfrastructure();
    }
  }

  private async setupInfrastructure() {
    // Crear exchange
    await this.eventsService.createExchange('user-events', {
      type: 'topic',
      durable: true,
    });

    // Crear cola
    await this.eventsService.createQueue('user-notifications', {
      durable: true,
      arguments: { 'x-message-ttl': 60000 },
    });
  }
}
```

### Consumo de Mensajes

```typescript
import { Injectable } from '@nestjs/common';
import { EventsService } from '@ap-dev/nestjs-events';

@Injectable()
export class ConsumerService {
  constructor(private readonly eventsService: EventsService) {}

  async startConsumer() {
    if (!this.eventsService.isConnected()) {
      console.log('RabbitMQ not connected, skipping consumer setup');
      return;
    }

    // Consumir mensajes
    const consumerTag = await this.eventsService.consume(
      'user-notifications',
      (message, ack, nack) => {
        try {
          console.log('Received:', message.content);
          ack(); // Confirmar procesamiento
        } catch (error) {
          console.error('Error processing message:', error);
          nack(true); // Rechazar y reencolar
        }
      },
      { noAck: false }
    );

    console.log('Consumer started with tag:', consumerTag);
  }
}
```

## Ejemplos de Configuración

### Variables de Entorno

```bash
# .env
RABBITMQ_URL=amqp://user:password@localhost:5672
RABBITMQ_QUEUE=events
RABBITMQ_EXCHANGE=app-events
RABBITMQ_ROUTING_KEY=app
```

### Configuración con Docker

```yaml
# docker-compose.yml
version: '3.8'
services:
  rabbitmq:
    image: rabbitmq:3-management
    ports:
      - "5672:5672"
      - "15672:15672"
    environment:
      RABBITMQ_DEFAULT_USER: admin
      RABBITMQ_DEFAULT_PASS: password
```

## Interfaces Disponibles

```typescript
interface RabbitMQConfig {
  url: string;
  queue?: string;
  exchange?: string;
  routingKey?: string;
  exchangeType?: 'direct' | 'topic' | 'fanout' | 'headers';
  durable?: boolean;
  persistent?: boolean;
  prefetch?: number;
}

interface MessageOptions {
  queue?: string;
  exchange?: string;
  routingKey?: string;
  persistent?: boolean;
  priority?: number;
  expiration?: string;
  headers?: Record<string, any>;
}
```

## Desarrollo

### Construir la librería

```bash
npm run build
```

### Ejecutar tests

```bash
npm test
```

### Publicar

```bash
npm publish
```

## Licencia

MIT