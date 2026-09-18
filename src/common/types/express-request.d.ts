import 'express';

declare module 'express' {
  interface Request {
    clientIp?: string;
  }
}
