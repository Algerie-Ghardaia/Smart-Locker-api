// =============================================================================
// src/modules/compartment/compartment.service.ts
// SERVICE COMPARTIMENTS — Logique métier
// =============================================================================

import { Injectable, NotFoundException, ConflictException, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Redis } from 'ioredis';
import { Compartment } from './compartment.entity';
import { CompartmentDto } from './dto/compartment.dto';
import { CompartmentStatus } from '../../common/types/compartment-status.enum';
import { REDIS_CLIENT } from '../redis/redis.module';

@Injectable()
export class CompartmentService {
  constructor(
    @InjectRepository(Compartment)
    private readonly compartmentRepo: Repository<Compartment>,
    @Inject(REDIS_CLIENT) private readonly redis: Redis, // ✅ CORRIGÉ
  ) {}

  async findAll(): Promise<Compartment[]> {
    return this.compartmentRepo.find({ relations: ['locker'] });
  }

  async findByLocker(lockerId: string): Promise<Compartment[]> {
    return this.compartmentRepo.find({
      where: { lockerId },
      order: { shelfNo: 'ASC' },
    });
  }

  async findOne(id: string): Promise<Compartment> {
    const compartment = await this.compartmentRepo.findOne({
      where: { id },
      relations: ['locker'],
    });
    if (!compartment) {
      throw new NotFoundException('Compartiment non trouvé');
    }
    return compartment;
  }

  async create(dto: CompartmentDto): Promise<Compartment> {
    const existing = await this.compartmentRepo.findOne({
      where: { shelfNo: dto.shelfNo },
    });

    if (existing) {
      throw new ConflictException('Numéro de case déjà utilisé');
    }

    const compartment = this.compartmentRepo.create(dto);
    const saved = await this.compartmentRepo.save(compartment);

    await this.redis.hset(
      `locker:${dto.lockerId}:compartments`,
      dto.shelfNo,
      CompartmentStatus.AVAILABLE
    );

    return saved;
  }

  async setMaintenance(id: string): Promise<Compartment> {
    const compartment = await this.findOne(id);
    
    if (compartment.status === CompartmentStatus.OCCUPIED) {
      throw new ConflictException('La case est occupée');
    }

    compartment.status = CompartmentStatus.MAINTENANCE;
    const saved = await this.compartmentRepo.save(compartment);

    await this.redis.hset(
      `locker:${compartment.lockerId}:compartments`,
      compartment.shelfNo,
      CompartmentStatus.MAINTENANCE
    );

    return saved;
  }

  async setAvailable(id: string): Promise<Compartment> {
    const compartment = await this.findOne(id);
    
    compartment.status = CompartmentStatus.AVAILABLE;
    compartment.currentParcelId = null;
    const saved = await this.compartmentRepo.save(compartment);

    await this.redis.hset(
      `locker:${compartment.lockerId}:compartments`,
      compartment.shelfNo,
      CompartmentStatus.AVAILABLE
    );

    return saved;
  }
}