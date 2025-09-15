import { Test, TestingModule } from '@nestjs/testing';
import { EventsService } from './events.service';

// Jest globals - comprehensive type declarations
declare const describe: (name: string, fn: () => void) => void;
declare const beforeEach: (fn: () => void | Promise<void>) => void;
declare const it: (name: string, fn: () => void | Promise<void>) => void;
declare const expect: (actual: any) => {
  toBeDefined(): any;
  toBe(expected: any): any;
  toHaveBeenCalled(): any;
  toThrow(): any;
  resolves: {
    toBeDefined(): Promise<any>;
    toBe(expected: any): Promise<any>;
    toThrow(): Promise<any>;
    not: {
      toBeDefined(): Promise<any>;
      toThrow(): Promise<any>;
    };
  };
  not: {
    toBeDefined(): any;
    toBe(expected: any): any;
    toThrow(): any;
  };
};

describe('EventsService', () => {
  let service: EventsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: EventsService,
          useFactory: () => new EventsService(),
        },
      ],
    }).compile();

    service = module.get<EventsService>(EventsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should indicate RabbitMQ is not enabled when no config provided', () => {
    expect(service.isRabbitMQEnabled()).toBe(false);
  });

  it('should not be connected when RabbitMQ is not configured', () => {
    expect(service.isConnected()).toBe(false);
  });

  it('should emit events without RabbitMQ', async () => {
    await expect(service.emitEvent('test', { data: 'test' })).resolves.not.toThrow();
  });
});
