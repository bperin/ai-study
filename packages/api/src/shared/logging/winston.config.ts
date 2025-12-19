import * as winston from 'winston';
import { WinstonModule } from 'nest-winston';

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf((info) => {
    const { timestamp, level, message, context, ...meta } = info;
    const logEntry: any = {
      timestamp,
      level,
      context,
      message,
      ...meta,
    };

    if (info.stack) {
      logEntry.stack = info.stack;
    }

    return JSON.stringify(logEntry);
  }),
);

const transports: winston.transport[] = [
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple(),
      winston.format.printf(({ timestamp, level, message, context }) => {
        return `${timestamp} [${context || 'Application'}] ${level}: ${message}`;
      }),
    ),
  }),
];

// Add file transport in production
if (process.env.NODE_ENV === 'production') {
  transports.push(
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      format: logFormat,
    }),
    new winston.transports.File({
      filename: 'logs/combined.log',
      format: logFormat,
    }),
  );
}

export const winstonConfig = {
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  transports,
};

export const createWinstonLogger = () => WinstonModule.createLogger(winstonConfig);
