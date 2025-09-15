import { DynamicModule, Module } from '@nestjs/common';
import { EventsService, EventsConfig } from './events.service';

@Module({})
export class EventsModule {
  static forRoot(config?: EventsConfig): DynamicModule {
    return {
      module: EventsModule,
      providers: [
        {
          provide: EventsService,
          useFactory: () => new EventsService(config),
        },
      ],
      exports: [EventsService],
      global: true,
    };
  }

  static forRootAsync(options: {
    useFactory: (...args: any[]) => Promise<EventsConfig> | EventsConfig;
    inject?: any[];
  }): DynamicModule {
    return {
      module: EventsModule,
      providers: [
        {
          provide: 'EVENTS_CONFIG',
          useFactory: options.useFactory,
          inject: options.inject || [],
        },
        {
          provide: EventsService,
          useFactory: (config: EventsConfig) => new EventsService(config),
          inject: ['EVENTS_CONFIG'],
        },
      ],
      exports: [EventsService],
      global: true,
    };
  }
}
