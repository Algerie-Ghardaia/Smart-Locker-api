// =============================================================================
// src/modules/hardware/drivers/rs485.driver.ts
// DRIVER RS485 — Communication Modbus RTU
// =============================================================================

import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SerialPort } from 'serialport';

@Injectable()
export class Rs485Driver implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(Rs485Driver.name);
  private port: SerialPort | null = null;
  private readonly OPEN_DURATION = 500;

  constructor(private config: ConfigService) {}

  async onModuleInit() {
    const portPath = this.config.get<string>('hardware.rs485Port');
    const baudRate = this.config.get<number>('hardware.rs485Baud', 9600);

    if (!portPath) {
      this.logger.warn('RS485_PORT non défini — mode simulation activé');
      return;
    }

    this.port = new SerialPort({ path: portPath, baudRate, autoOpen: false });
    
    await new Promise<void>((resolve, reject) =>
      this.port!.open((err) => err ? reject(err) : resolve())
    );
    
    this.logger.log(`RS485 connecté sur ${portPath} @ ${baudRate} baud`);
  }

  async onModuleDestroy() {
    if (this.port?.isOpen) {
      this.port.close();
    }
  }

  async unlock(boardNo: number, lockNo: number): Promise<boolean> {
    if (!this.port) {
      this.logger.warn(`[SIMULATION] Unlock board=${boardNo} lock=${lockNo}`);
      return true;
    }

    const frame = this.buildModbusFrame(boardNo, lockNo, 0xFF00);
    return this.writeAndWait(frame);
  }

  async lock(boardNo: number, lockNo: number): Promise<boolean> {
    if (!this.port) return true;
    const frame = this.buildModbusFrame(boardNo, lockNo, 0x0000);
    return this.writeAndWait(frame);
  }

  private buildModbusFrame(addr: number, coil: number, value: number): Buffer {
    const frame = Buffer.alloc(8);
    frame[0] = addr;
    frame[1] = 0x05;
    frame[2] = 0x00;
    frame[3] = coil;
    frame[4] = (value >> 8) & 0xFF;
    frame[5] = value & 0xFF;
    const crc = this.crc16(frame.subarray(0, 6));
    frame[6] = crc & 0xFF;
    frame[7] = (crc >> 8) & 0xFF;
    return frame;
  }

  private writeAndWait(frame: Buffer): Promise<boolean> {
    return new Promise((resolve) => {
      this.port!.write(frame, (err) => {
        if (err) {
          this.logger.error('RS485 write error:', err);
          resolve(false);
          return;
        }
        setTimeout(() => this.port!.drain(() => resolve(true)), this.OPEN_DURATION);
      });
    });
  }

  private crc16(buf: Buffer): number {
    let crc = 0xFFFF;
    for (const byte of buf) {
      crc ^= byte;
      for (let i = 0; i < 8; i++) {
        crc = crc & 1 ? (crc >> 1) ^ 0xA001 : crc >> 1;
      }
    }
    return crc;
  }
}