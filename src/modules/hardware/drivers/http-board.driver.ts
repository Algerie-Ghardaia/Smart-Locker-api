// =============================================================================
// src/modules/hardware/drivers/http-board.driver.ts
// DRIVER HTTP — Communication avec boards WiFi/Ethernet
// =============================================================================

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosError } from 'axios';
import { generateMd5Sign } from '../../../common/helpers/md5.helper';

@Injectable()
export class HttpBoardDriver {
  private readonly logger = new Logger(HttpBoardDriver.name);

  constructor(private config: ConfigService) {}

  async unlock(boardIp: string, lockNo: number): Promise<boolean> {
    const secret = this.config.get<string>('hardware.lockerSecret');
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const sign = generateMd5Sign(boardIp, lockNo.toString(), timestamp);

    try {
      const response = await axios.post(
        `http://${boardIp}/unlock`,
        {
          lock_no: lockNo,
          timestamp,
          sign,
        },
        { 
          timeout: 5000,
          headers: { 'Content-Type': 'application/json' },
        }
      );

      return response.data?.success === true;
    } catch (error) {
      // ✅ CORRIGÉ : Gestion d'erreur typée avec AxiosError
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;
        this.logger.error(
          `Erreur HTTP board ${boardIp}: ${axiosError.message} - Code: ${axiosError.response?.status || 'N/A'}`
        );
      } else if (error instanceof Error) {
        this.logger.error(`Erreur board ${boardIp}: ${error.message}`);
      } else {
        this.logger.error(`Erreur inconnue board ${boardIp}`);
      }
      return false;
    }
  }

  async health(boardIp: string): Promise<boolean> {
    try {
      const response = await axios.get(`http://${boardIp}/health`, { 
        timeout: 3000 
      });
      return response.status === 200;
    } catch (error) {
      // ✅ CORRIGÉ : Gestion d'erreur typée
      if (axios.isAxiosError(error)) {
        this.logger.debug(`Board ${boardIp} health check failed: ${error.message}`);
      }
      return false;
    }
  }
}