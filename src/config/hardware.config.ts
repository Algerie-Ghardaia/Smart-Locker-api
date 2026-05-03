import { registerAs } from '@nestjs/config';

export default registerAs('hardware', () => ({
  rs485Port: process.env.RS485_PORT || undefined,
  rs485Baud: parseInt(process.env.RS485_BAUD || '9600', 10),
  lockerSecret: process.env.LOCKER_SECRET || 'default_secret',
  defaultLockerId: process.env.DEFAULT_LOCKER_ID || 'locker-001',
  pickupCodeExpiryHours: parseInt(process.env.PICKUP_CODE_EXPIRY_HOURS || '72', 10),
  pickupCodeLength: parseInt(process.env.PICKUP_CODE_LENGTH || '6', 10),
}));