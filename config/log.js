import path from 'path';
import winston from 'winston';

export const logPath = path.join(__dirname, '/../logs/log');
export const logger = new (winston.Logger)({
  transports: [
    new (winston.transports.Console)({
      prettyPrint: true,
    }),
    new (winston.transports.File)({ filename: logPath }),
  ],
});
