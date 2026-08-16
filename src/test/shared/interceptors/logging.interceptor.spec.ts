import axios from 'axios';
import * as fs from 'node:fs';
import {
  ConfigurationFactory,
  FileLocalLogProvider,
  HttpRemoteLogProvider,
  LogDataBuilder,
  LogSeverity,
  LoggingService,
} from '@shared/interceptors/logging.interceptor';

jest.mock('axios');

describe('logging.interceptor units', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('LogDataBuilder', () => {
    it('debe construir un LogData válido con defaults', () => {
      const log = LogDataBuilder.create()
        .withSeverity(LogSeverity.INFO)
        .withMessage('ok')
        .build();

      expect(log.severity).toBe(LogSeverity.INFO);
      expect(log.message).toBe('ok');
      expect(log.source).toBe('unknown');
      expect(log.data).toEqual({});
      expect(log.timestamp).toBeInstanceOf(Date);
    });

    it('debe lanzar error si faltan campos obligatorios', () => {
      expect(() => LogDataBuilder.create().withMessage('x').build()).toThrow(
        'Severity y message son campos obligatorios',
      );
    });
  });

  describe('ConfigurationFactory', () => {
    it('debe mapear valores desde ConfigService', () => {
      const configService = {
        get: jest.fn((key: string, defaultValue: unknown) => {
          const map: Record<string, unknown> = {
            LOG_SERVICE_URL: 'http://logger:3000',
            APP_DEV: 'true',
            SERVICE_NAME: 'cost-manager',
            LOG_MAX_RETRIES: 5,
          };
          return key in map ? map[key] : defaultValue;
        }),
      };

      const factory = new ConfigurationFactory(configService as any);
      const cfg = factory.createLoggingConfig();

      expect(cfg).toEqual({
        logServiceUrl: 'http://logger:3000',
        isDevEnvironment: true,
        serviceName: 'cost-manager',
        maxRetries: 5,
      });
    });
  });

  describe('HttpRemoteLogProvider', () => {
    it('debe enviar log remoto exitosamente', async () => {
      (axios.post as jest.Mock).mockResolvedValue({ status: 200 });
      const provider = new HttpRemoteLogProvider();

      await expect(
        provider.sendLog({
          severity: LogSeverity.INFO,
          message: 'test',
          timestamp: new Date(),
          source: 'svc',
          data: {},
        }),
      ).resolves.toBeUndefined();
    });

    it('debe lanzar error si falla el envío remoto', async () => {
      (axios.post as jest.Mock).mockRejectedValue(new Error('network fail'));
      const provider = new HttpRemoteLogProvider();

      await expect(
        provider.sendLog({
          severity: LogSeverity.INFO,
          message: 'test',
          timestamp: new Date(),
          source: 'svc',
          data: {},
        }),
      ).rejects.toThrow('Fallo al enviar log remoto');
    });
  });

  describe('FileLocalLogProvider', () => {
    it('debe guardar el log localmente en fallback-logs.json', async () => {
      const accessSpy = jest
        .spyOn(fs.promises, 'access')
        .mockResolvedValue(undefined);
      const mkdirSpy = jest
        .spyOn(fs.promises, 'mkdir')
        .mockResolvedValue(undefined);
      const appendSpy = jest
        .spyOn(fs.promises, 'appendFile')
        .mockResolvedValue(undefined);

      const provider = new FileLocalLogProvider();
      await provider.saveLog({
        severity: LogSeverity.ERROR,
        message: 'fallo',
        timestamp: new Date(),
        source: 'svc',
        data: { id: 1 },
      });

      expect(appendSpy).toHaveBeenCalledTimes(1);
      expect(mkdirSpy).not.toHaveBeenCalled();

      accessSpy.mockRestore();
      mkdirSpy.mockRestore();
      appendSpy.mockRestore();
    });
  });

  describe('LoggingService', () => {
    it('debe usar fallback local si falla proveedor remoto', async () => {
      const remoteProvider = {
        sendLog: jest.fn().mockRejectedValue(new Error('remote down')),
      };
      const localProvider = {
        saveLog: jest.fn().mockResolvedValue(undefined),
      };
      const configurationFactory = {
        createLoggingConfig: jest.fn().mockReturnValue({
          logServiceUrl: 'http://logger:3000',
          isDevEnvironment: false,
          serviceName: 'svc',
          maxRetries: 3,
        }),
      };

      const service = new LoggingService(
        remoteProvider,
        localProvider,
        configurationFactory,
      );

      await service.sendLog('evento', 'INFO', { a: 1 });

      expect(remoteProvider.sendLog).toHaveBeenCalledTimes(1);
      expect(localProvider.saveLog).toHaveBeenCalledTimes(1);
    });

    it('debe lanzar error si tipo de log es inválido', async () => {
      const service = new LoggingService(
        { sendLog: jest.fn() },
        { saveLog: jest.fn() },
        {
          createLoggingConfig: jest.fn().mockReturnValue({
            logServiceUrl: 'http://logger:3000',
            isDevEnvironment: false,
            serviceName: 'svc',
            maxRetries: 3,
          }),
        },
      );

      await expect(service.sendLog('evento', 'INVALID' as any)).rejects.toThrow(
        'Tipo de log inválido',
      );
    });
  });
});
