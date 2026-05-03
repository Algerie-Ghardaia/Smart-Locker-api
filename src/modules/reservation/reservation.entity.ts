// =============================================================================
// src/modules/reservation/reservation.entity.ts
// ENTITÉ RÉSERVATION — Réservation d'une case pour une période
// =============================================================================

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  Index,
} from 'typeorm';
import { User } from '../user/user.entity';
import { Compartment } from '../compartment/compartment.entity';
import { Locker } from '../locker/locker.entity';
import { CompartmentSize } from '../../common/types/compartment-size.enum';
import { ReservationStatus } from './types/reservation-status.enum';

@Entity('reservations')
@Index(['lockerId', 'startDate', 'endDate'])
@Index(['userId', 'status'])
@Index(['compartmentId'])
export class Reservation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // ---------------------------------------------------------------------------
  // Relations
  // ---------------------------------------------------------------------------

  @ManyToOne(() => User, { eager: true, nullable: false })
  user: User;

  @Column()
  userId: string;

  @ManyToOne(() => Locker, { eager: true, nullable: false })
  locker: Locker;

  @Column()
  lockerId: string;

  @ManyToOne(() => Compartment, { eager: true, nullable: true })
  compartment: Compartment;

  @Column({ nullable: true })
  compartmentId: string;

  // ---------------------------------------------------------------------------
  // Détails de la réservation
  // ---------------------------------------------------------------------------

  @Column({ type: 'enum', enum: CompartmentSize })
  requestedSize: CompartmentSize;

  @Column({ type: 'enum', enum: ReservationStatus, default: ReservationStatus.CONFIRMED })
  status: ReservationStatus;

  @Column({ type: 'timestamp' })
  startDate: Date;

  @Column({ type: 'timestamp' })
  endDate: Date;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  totalPrice: number;

  @Column({ nullable: true })
  trackingNo: string;

  @Column({ nullable: true })
  pickupCode: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  // ---------------------------------------------------------------------------
  // Timestamps
  // ---------------------------------------------------------------------------

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}