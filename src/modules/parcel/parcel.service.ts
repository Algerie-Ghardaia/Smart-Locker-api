// =============================================================================
// src/modules/parcel/parcel.service.ts
// SERVICE COLIS — Logique métier complète (VERSION CORRIGÉE)
// =============================================================================
//
// Corrections appliquées (2026-05-02) :
//   ✅ Ajout du champ 'method' dans pickup() pour tracer QR vs manuel
//   ✅ Message d'erreur plus clair pour code invalide
//   ✅ Log enrichi avec méthode de retrait
// =============================================================================

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  Inject,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, IsNull, Not } from 'typeorm';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { Redis } from 'ioredis';
import * as QRCode from 'qrcode';

import { Parcel } from './parcel.entity';
import { Compartment } from '../compartment/compartment.entity';
import { CompartmentStatus } from '../../common/types/compartment-status.enum';
import { ParcelStatus } from '../../common/types/parcel-status.enum';
import { HardwareService } from '../hardware/hardware.service';
import { EventLogService } from '../event-log/event-log.service';
import { LockerGateway } from '../../gateways/locker.gateway';
import { REDIS_CLIENT } from '../redis/redis.module';
import { DepositDto } from './dto/deposit.dto';
import { PickupDto } from './dto/pickup.dto';
import { generatePickupCode } from '../../common/helpers/code-generator.helper';
import { renderPickupTemplate } from '../qrcode/templates/pickup.template';
import { EventType } from '../event-log/schemas/event-log.schema';
import {
  dateToIso,
  formatGpsCoordinates,
} from '../../common/helpers/date.helper';
import {
  buildCompartmentKey,
  COMPARTMENT_CACHE_TTL,
} from '../../common/constants/cache.constants';
import {
  PICKUP_DELAY_HOURS,
  PICKUP_DELAY_MS,
  BASE_EARNINGS_PER_PARCEL,
} from './parcel.constants';
import { MissionTypeFilter } from './dto/missions-query.dto';
import type {
  DepositResult,
  PickupResult,
  ConfirmDepositResult,
  TrackingPublicInfo,
  ParcelDetailInfo,
  PaginatedHistory,
  MissionItem,
  GetMissionsOptions,
} from './parcel.types';

@Injectable()
export class ParcelService {
  private readonly logger = new Logger(ParcelService.name);

  constructor(
    @InjectRepository(Parcel) private readonly parcelRepo: Repository<Parcel>,
    @InjectRepository(Compartment)
    private readonly compartmentRepo: Repository<Compartment>,
    private readonly hardware: HardwareService,
    private readonly eventLog: EventLogService,
    private readonly gateway: LockerGateway,
    @InjectQueue('sms') private readonly smsQueue: Queue,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly dataSource: DataSource,
  ) {}

  // ===========================================================================
  // 1. GÉNÉRATION DE NUMÉRO DE SUIVI
  // ===========================================================================

  async generateTrackingNumber(prefix: string = 'SL'): Promise<string> {
    const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const countToday = await this.parcelRepo
      .createQueryBuilder('parcel')
      .where('parcel.trackingNo LIKE :pattern', {
        pattern: `${prefix}-${datePart}-%`,
      })
      .getCount();

    const sequence = String(countToday + 1).padStart(3, '0');
    const trackingNo = `${prefix}-${datePart}-${sequence}`;

    this.logger.log(`📦 Tracking généré : ${trackingNo}`);
    return trackingNo;
  }

  // ===========================================================================
  // 2. DÉPÔT DE COLIS
  // ===========================================================================

  async deposit(dto: DepositDto, userId: string): Promise<DepositResult> {
    return this.dataSource.transaction(async (manager) => {
      const compartment = await this.#findAvailableCompartment(manager, dto);
      const pickupCode = await this.#generateUniquePickupCode();
      const storedAt = new Date();
      const expiresAt = new Date(storedAt.getTime() + PICKUP_DELAY_MS);

      const parcel = manager.create(Parcel, {
        trackingNo: dto.trackingNo,
        pickupCode,
        recipientPhone: dto.recipientPhone ?? null,
        recipientName: dto.recipientName ?? null,
        recipientEmail: dto.recipientEmail ?? null,
        notes: dto.notes ?? null,
        compartment,
        status: ParcelStatus.STORED,
        storedAt,
        expiresAt,
        photoDepositUrl: dto.photoUrl ?? null,
        depositedBy: { id: userId },
      });
      await manager.save(parcel);

      compartment.status = CompartmentStatus.OCCUPIED;
      compartment.currentParcelId = parcel.id;
      await manager.save(compartment);

      await this.hardware.unlock(compartment.boardNo, compartment.lockNo);

      await this.#setRedisCompartmentStatus(
        dto.lockerId,
        compartment.shelfNo,
        CompartmentStatus.OCCUPIED,
      );

      const qrCode = await this.#generateQRCodeDataURL(pickupCode);

      if (dto.recipientPhone) {
        await this.#enqueueSMS(
          dto.recipientPhone,
          dto.recipientName ?? 'Client',
          pickupCode,
          compartment.shelfNo,
          expiresAt,
        );
      }

      this.gateway.emitCompartmentUpdate(dto.lockerId, {
        shelfNo: compartment.shelfNo,
        status: CompartmentStatus.OCCUPIED,
      });

      await this.eventLog.create({
        type: EventType.DEPOSIT,
        lockerId: dto.lockerId,
        shelfNo: compartment.shelfNo,
        parcelId: parcel.id,
        userId,
        username: dto.recipientName ?? 'Système',
        metadata: {
          trackingNo: dto.trackingNo,
          phone: dto.recipientPhone,
          pickupCode,
          size: dto.size ?? 'M',
          notes: dto.notes,
        },
      });

      this.logger.log(
        `✅ Dépôt OK — case ${compartment.shelfNo} | code ${pickupCode}`,
      );
      return {
        pickupCode,
        shelfNo: compartment.shelfNo,
        qrCode,
        trackingNo: dto.trackingNo,
        expiresAt: expiresAt.toISOString(),
      };
    });
  }

  // ===========================================================================
  // 3. RETRAIT CLIENT — PUBLIC (avec méthode de traçage)
  // ===========================================================================

  /**
   * Retrait d'un colis par le client final.
   * Accessible sans authentification (public).
   *
   * @param dto - PickupDto contenant le code et la méthode (QR/manual)
   * @returns Confirmation de retrait avec numéro de case
   */
  async pickup(dto: PickupDto): Promise<PickupResult> {
    return this.dataSource.transaction(async (manager) => {
      const parcel = await this.#findParcelForPickup(manager, dto.code);

      if (new Date() > parcel.expiresAt!) {
        throw new BadRequestException(
          'Code expiré (72h) — contactez le support SmartLocker',
        );
      }

      const unlocked = await this.hardware.unlock(
        parcel.compartment!.boardNo,
        parcel.compartment!.lockNo,
      );

      if (!unlocked) {
        throw new BadRequestException(
          "Erreur technique à l'ouverture — veuillez réessayer ou contacter le support",
        );
      }

      parcel.status = ParcelStatus.PICKED_UP;
      parcel.pickedAt = new Date();
      await manager.save(parcel);

      parcel.compartment!.status = CompartmentStatus.AVAILABLE;
      parcel.compartment!.currentParcelId = null;
      await manager.save(parcel.compartment!);

      await this.#setRedisCompartmentStatus(
        parcel.compartment!.lockerId,
        parcel.compartment!.shelfNo,
        CompartmentStatus.AVAILABLE,
      );

      this.gateway.emitCompartmentUpdate(parcel.compartment!.lockerId, {
        shelfNo: parcel.compartment!.shelfNo,
        status: CompartmentStatus.AVAILABLE,
      });

      // ✅ Log enrichi avec la méthode de retrait (QR code ou saisie manuelle)
      await this.eventLog.create({
        type: EventType.PICKUP,
        lockerId: parcel.compartment!.lockerId,
        shelfNo: parcel.compartment!.shelfNo,
        parcelId: parcel.id,
        metadata: {
          pickupCode: dto.code,
          method: dto.method || 'qrcode',
          timestamp: new Date().toISOString(),
        },
      });

      this.logger.log(
        `📤 Retrait OK — case ${parcel.compartment!.shelfNo} | méthode: ${dto.method || 'qrcode'}`,
      );

      return {
        shelfNo: parcel.compartment!.shelfNo,
        message: 'Case ouverte ! Récupérez votre colis.',
      };
    });
  }

  // ===========================================================================
  // 4. SUIVI PUBLIC
  // ===========================================================================

  async track(query: string): Promise<TrackingPublicInfo> {
    const normalized = query.trim();
    const isPickupCode = /^\d{6}$/.test(normalized);

    const parcel = await this.parcelRepo.findOne({
      where: isPickupCode
        ? { pickupCode: normalized }
        : { trackingNo: normalized.toUpperCase() },
      relations: ['compartment', 'compartment.locker'],
    });

    if (!parcel) {
      throw new NotFoundException(
        isPickupCode
          ? 'Code de retrait invalide ou colis déjà récupéré'
          : `Numéro de suivi "${normalized}" non trouvé`,
      );
    }

    return {
      trackingNo: parcel.trackingNo,
      status: parcel.status,
      storedAt: dateToIso(parcel.storedAt),
      expiresAt: dateToIso(parcel.expiresAt),
      pickedAt: dateToIso(parcel.pickedAt),
      shelfNo: parcel.compartment?.shelfNo ?? null,
      lockerName: parcel.compartment?.locker?.name ?? null,
      lockerLocation: formatGpsCoordinates(
        parcel.compartment?.locker?.latitude,
        parcel.compartment?.locker?.longitude,
      ),
      recipientName: parcel.recipientName ?? null,
      pickupDelayHours: PICKUP_DELAY_HOURS,
    };
  }

  // ===========================================================================
  // 5. DÉTAIL AUTHENTIFIÉ
  // ===========================================================================

  async getDetail(trackingNo: string): Promise<ParcelDetailInfo> {
    const parcel = await this.parcelRepo.findOne({
      where: { trackingNo: trackingNo.toUpperCase() },
      relations: ['compartment', 'compartment.locker', 'depositedBy'],
    });
    if (!parcel) {
      throw new NotFoundException(`Colis "${trackingNo}" non trouvé`);
    }

    return {
      id: parcel.id,
      trackingNo: parcel.trackingNo,
      pickupCode: parcel.pickupCode,
      status: parcel.status,
      recipientName: parcel.recipientName ?? null,
      recipientPhone: parcel.recipientPhone ?? null,
      recipientEmail: parcel.recipientEmail ?? null,
      lockerName: parcel.compartment?.locker?.name ?? null,
      lockerLocation: formatGpsCoordinates(
        parcel.compartment?.locker?.latitude,
        parcel.compartment?.locker?.longitude,
      ),
      shelfNo: parcel.compartment?.shelfNo ?? null,
      size: parcel.compartment?.size ?? null,
      storedAt: dateToIso(parcel.storedAt),
      pickedAt: dateToIso(parcel.pickedAt),
      expiresAt: dateToIso(parcel.expiresAt),
      createdAt: parcel.createdAt.toISOString(),
      updatedAt: parcel.updatedAt.toISOString(),
      qrCodeBase64: parcel.qrCodeBase64 ?? null,
      photoDepositUrl: parcel.photoDepositUrl ?? null,
      photoPickupUrl: parcel.photoPickupUrl ?? null,
      notes: parcel.notes ?? null,
      depositedBy: parcel.depositedBy?.username ?? null,
      pickupDelayHours: PICKUP_DELAY_HOURS,
    };
  }

  // ===========================================================================
  // 6. HISTORIQUE PAGINÉ
  // ===========================================================================

  async getHistory(options: {
    page: number;
    limit: number;
    userId?: string;
  }): Promise<PaginatedHistory> {
    const whereClause = options.userId
      ? { depositedBy: { id: options.userId } }
      : {};
    const [rows, total] = await this.parcelRepo.findAndCount({
      where: whereClause,
      relations: ['compartment', 'compartment.locker', 'depositedBy'],
      order: { createdAt: 'DESC' },
      skip: (options.page - 1) * options.limit,
      take: options.limit,
    });

    return {
      data: rows.map((p) => ({
        id: p.id,
        trackingNo: p.trackingNo,
        pickupCode: p.pickupCode,
        status: p.status,
        recipientName: p.recipientName ?? null,
        recipientPhone: p.recipientPhone ?? null,
        shelfNo: p.compartment?.shelfNo ?? null,
        lockerName: p.compartment?.locker?.name ?? null,
        storedAt: dateToIso(p.storedAt),
        pickedAt: dateToIso(p.pickedAt),
        expiresAt: dateToIso(p.expiresAt),
        depositedBy: p.depositedBy?.username ?? null,
        depositedById: p.depositedBy?.id ?? null,
      })),
      meta: {
        total,
        page: options.page,
        limit: options.limit,
        totalPages: Math.ceil(total / options.limit),
      },
    };
  }

  // ===========================================================================
  // 7. MISSIONS LIVREUR
  // ===========================================================================

  async getMissions(
    courierId: string,
    options?: GetMissionsOptions,
  ): Promise<{ myParcels: MissionItem[]; availableMissions: MissionItem[] }> {
    const filterType = options?.type ?? MissionTypeFilter.ALL;

    const myParcelsWhere: any = {
      depositedBy: { id: courierId },
      status: ParcelStatus.STORED,
    };

    if (filterType === MissionTypeFilter.LOCKER) {
      myParcelsWhere.compartment = { lockerId: Not(IsNull()) };
    } else if (filterType === MissionTypeFilter.HOME) {
      myParcelsWhere.compartment = { lockerId: IsNull() };
    }

    const [myParcels, available] = await Promise.all([
      this.parcelRepo.find({
        where: myParcelsWhere,
        relations: ['compartment', 'compartment.locker', 'depositedBy'],
        order: { storedAt: 'DESC' },
        take: 20,
      }),
      this.parcelRepo.find({
        where: { status: ParcelStatus.PENDING },
        relations: ['compartment', 'compartment.locker'],
        order: { createdAt: 'DESC' },
        take: 20,
      }),
    ]);

    const filteredAvailable =
      filterType === MissionTypeFilter.LOCKER ? [] : available;

    return {
      myParcels: myParcels.map((p) => this.#formatMissionItem(p, courierId)),
      availableMissions: filteredAvailable.map((p) =>
        this.#formatMissionItem(p, courierId),
      ),
    };
  }

  // ===========================================================================
  // 8. ACCEPTER UNE MISSION
  // ===========================================================================

  async claimMission(
    trackingNo: string,
    courierId: string,
  ): Promise<MissionItem> {
    return this.dataSource.transaction(async (manager) => {
      const parcel = await manager
        .createQueryBuilder(Parcel, 'p')
        .where('p.trackingNo = :trackingNo', { trackingNo })
        .andWhere('p.status = :status', { status: ParcelStatus.PENDING })
        .setLock('pessimistic_write')
        .getOne();

      if (!parcel) {
        throw new NotFoundException(
          'Mission introuvable ou déjà prise par un autre livreur',
        );
      }

      parcel.depositedBy = { id: courierId } as any;
      await manager.save(parcel);

      const updated = await manager.findOne(Parcel, {
        where: { id: parcel.id },
        relations: ['compartment', 'compartment.locker', 'depositedBy'],
      });

      this.logger.log(`🚚 Mission ${trackingNo} acceptée`);
      return this.#formatMissionItem(updated!, courierId);
    });
  }

  // ===========================================================================
  // 9. CONFIRMER LE DÉPÔT
  // ===========================================================================

  async confirmDeposit(
    trackingNo: string,
    courierId: string,
  ): Promise<ConfirmDepositResult> {
    return this.dataSource.transaction(async (manager) => {
      const locked = await manager
        .createQueryBuilder(Parcel, 'p')
        .where('p.trackingNo = :trackingNo', { trackingNo })
        .andWhere('p.status = :status', { status: ParcelStatus.STORED })
        .andWhere('p.depositedById = :courierId', { courierId })
        .setLock('pessimistic_write')
        .getOne();

      if (!locked) {
        throw new NotFoundException(
          'Colis non trouvé, non assigné à ce livreur, ou déjà confirmé',
        );
      }

      const parcel = await manager.findOne(Parcel, {
        where: { id: locked.id },
        relations: ['compartment', 'compartment.locker'],
      });

      if (!parcel || !parcel.compartment) {
        throw new BadRequestException("Ce colis n'est pas associé à un casier");
      }

      if (parcel.recipientPhone) {
        await this.#enqueueSMS(
          parcel.recipientPhone,
          parcel.recipientName ?? 'Client',
          parcel.pickupCode,
          parcel.compartment.shelfNo,
          parcel.expiresAt,
        );
      }

      await this.eventLog.create({
        type: EventType.DEPOSIT_CONFIRMED,
        lockerId: parcel.compartment.lockerId,
        shelfNo: parcel.compartment.shelfNo,
        parcelId: parcel.id,
        userId: courierId,
        metadata: {
          trackingNo,
          pickupCode: parcel.pickupCode,
          recipientPhone: parcel.recipientPhone,
          recipientName: parcel.recipientName,
          shelfNo: parcel.compartment.shelfNo,
          lockerName: parcel.compartment.locker?.name,
        },
      });

      this.logger.log(`✅ Dépôt confirmé — ${trackingNo} | SMS envoyé`);

      return {
        trackingNo: parcel.trackingNo,
        pickupCode: parcel.pickupCode,
        shelfNo: parcel.compartment.shelfNo,
        lockerName: parcel.compartment.locker?.name ?? '',
        lockerLocation:
          formatGpsCoordinates(
            parcel.compartment.locker?.latitude,
            parcel.compartment.locker?.longitude,
          ) ?? '',
        recipientName: parcel.recipientName ?? 'Client',
        expiresAt: parcel.expiresAt?.toISOString() ?? '',
        message:
          'Dépôt confirmé — le destinataire va recevoir son code de retrait par SMS.',
      };
    });
  }

  // ===========================================================================
  // 10. GÉNÉRATION PAGE HTML QR CODE
  // ===========================================================================

  async generateQRCodePage(trackingNo: string): Promise<string> {
    const parcel = await this.parcelRepo.findOne({
      where: { trackingNo },
      relations: ['compartment', 'compartment.locker'],
    });
    if (!parcel) throw new NotFoundException('Colis non trouvé');

    const qrCodeDataUrl = await this.#generateQRCodeDataURL(parcel.pickupCode);

    return renderPickupTemplate({
      code: parcel.pickupCode,
      qrCode: qrCodeDataUrl,
      recipientName: parcel.recipientName ?? 'Client',
      shelfNo: parcel.compartment?.shelfNo ?? 'À déterminer',
      expiresAt: parcel.expiresAt?.toISOString(),
      lockerLocation:
        parcel.compartment?.locker?.location ?? 'Centre Commercial',
      companyName: 'SmartLocker',
      supportPhone: '+213 23 00 00 00',
    });
  }

  // ===========================================================================
  // HELPERS PRIVÉS
  // ===========================================================================

  async #findAvailableCompartment(
    manager: any,
    dto: DepositDto,
  ): Promise<Compartment> {
    const compartment = await manager
      .createQueryBuilder(Compartment, 'c')
      .where('c.lockerId = :lockerId', { lockerId: dto.lockerId })
      .andWhere('c.status = :status', { status: CompartmentStatus.AVAILABLE })
      .andWhere('c.size = :size', { size: dto.size ?? 'M' })
      .orderBy('c.shelfNo', 'ASC')
      .setLock('pessimistic_write')
      .getOne();

    if (!compartment) {
      throw new BadRequestException(
        `Aucune case disponible de taille "${dto.size ?? 'M'}" dans ce casier`,
      );
    }
    return compartment;
  }

  /**
   * Recherche un colis par code de retrait avec lock pessimiste.
   * ✅ Message d'erreur clair et non ambigu.
   */
  async #findParcelForPickup(
    manager: any,
    pickupCode: string,
  ): Promise<Parcel> {
    const locked = await manager
      .createQueryBuilder(Parcel, 'p')
      .where('p.pickupCode = :code', { code: pickupCode })
      .andWhere('p.status = :status', { status: ParcelStatus.STORED })
      .setLock('pessimistic_write')
      .getOne();

    if (!locked) {
      throw new NotFoundException('Code invalide ou colis déjà récupéré');
    }

    const parcel = await manager.findOne(Parcel, {
      where: { id: locked.id },
      relations: ['compartment', 'compartment.locker'],
    });

    if (!parcel) {
      throw new NotFoundException('Colis introuvable après vérification');
    }

    return parcel;
  }

  async #generateUniquePickupCode(): Promise<string> {
    for (let attempt = 0; attempt < 10; attempt++) {
      const code = generatePickupCode(6);
      const found = await this.parcelRepo.findOne({
        where: { pickupCode: code, status: ParcelStatus.STORED },
      });
      if (!found) return code;
    }
    throw new BadRequestException(
      'Impossible de générer un code unique — réessayez',
    );
  }

  async #generateQRCodeDataURL(content: string): Promise<string> {
    try {
      return await QRCode.toDataURL(content, {
        width: 400,
        margin: 2,
        color: { dark: '#000000', light: '#FFFFFF' },
      });
    } catch (err) {
      this.logger.error(`Erreur génération QR code : ${err}`);
      throw new BadRequestException('Erreur lors de la génération du QR code');
    }
  }

  async #setRedisCompartmentStatus(
    lockerId: string,
    shelfNo: string,
    status: CompartmentStatus,
  ): Promise<void> {
    const key = buildCompartmentKey(lockerId);
    await this.redis.hset(key, shelfNo, status);
    await this.redis.expire(key, COMPARTMENT_CACHE_TTL);
  }

  async #enqueueSMS(
    phone: string,
    name: string,
    code: string,
    shelf: string,
    expiresAt: Date | null,
  ): Promise<void> {
    await this.smsQueue.add(
      'send-pickup-code',
      {
        phone,
        name,
        code,
        shelf,
        expiresAt: expiresAt?.toISOString() ?? '',
      },
      { attempts: 3, backoff: { type: 'exponential', delay: 5_000 } },
    );
  }

  #formatMissionItem(parcel: Parcel, courierId?: string): MissionItem {
    return {
      id: parcel.id,
      trackingNo: parcel.trackingNo,
      status: parcel.status,
      recipientName: parcel.recipientName ?? null,
      recipientPhone: parcel.recipientPhone ?? null,
      lockerName: parcel.compartment?.locker?.name ?? null,
      lockerLocation: formatGpsCoordinates(
        parcel.compartment?.locker?.latitude,
        parcel.compartment?.locker?.longitude,
      ),
      shelfNo: parcel.compartment?.shelfNo ?? null,
      storedAt: dateToIso(parcel.storedAt),
      expiresAt: dateToIso(parcel.expiresAt),
      createdAt: parcel.createdAt.toISOString(),
      isMine: courierId ? parcel.depositedBy?.id === courierId : false,
      earnings: BASE_EARNINGS_PER_PARCEL,
    };
  }
}
