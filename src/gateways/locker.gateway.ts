// =============================================================================
// src/gateways/locker.gateway.ts
// GATEWAY — WebSocket pour les mises à jour en temps réel
// =============================================================================

import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { JwtWsGuard } from '../common/guards/jwt-ws.guard';

@WebSocketGateway({
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(',') ?? '*',
    credentials: true,
  },
  namespace: '/locker',
})
export class LockerGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(LockerGateway.name);
  
  // Suivi des clients connectés
  private connectedClients = new Map<string, Set<string>>();

  /**
   * Appelé lorsqu'un client se connecte.
   */
  handleConnection(client: Socket) {
    this.logger.log(`Client connecté: ${client.id}`);
    
    // Envoyer un message de bienvenue
    client.emit('welcome', {
      message: 'Connecté au serveur SmartLocker',
      clientId: client.id,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Appelé lorsqu'un client se déconnecte.
   */
  handleDisconnect(client: Socket) {
    this.logger.log(`Client déconnecté: ${client.id}`);
    
    // Nettoyer les rooms
    this.connectedClients.delete(client.id);
  }

  /**
   * Rejoindre une room pour un casier spécifique.
   */
  @SubscribeMessage('join:locker')
  handleJoinLocker(
    @ConnectedSocket() client: Socket,
    @MessageBody() lockerId: string,
  ) {
    const roomName = `locker:${lockerId}`;
    
    client.join(roomName);
    client.emit('joined', {
      lockerId,
      room: roomName,
      timestamp: new Date().toISOString(),
    });
    
    // Suivre les rooms du client
    if (!this.connectedClients.has(client.id)) {
      this.connectedClients.set(client.id, new Set());
    }
    this.connectedClients.get(client.id)!.add(roomName);
    
    this.logger.log(`Client ${client.id} a rejoint ${roomName}`);
  }

  /**
   * Quitter une room.
   */
  @SubscribeMessage('leave:locker')
  handleLeaveLocker(
    @ConnectedSocket() client: Socket,
    @MessageBody() lockerId: string,
  ) {
    const roomName = `locker:${lockerId}`;
    
    client.leave(roomName);
    client.emit('left', {
      lockerId,
      room: roomName,
      timestamp: new Date().toISOString(),
    });
    
    // Nettoyer le suivi
    const clientRooms = this.connectedClients.get(client.id);
    if (clientRooms) {
      clientRooms.delete(roomName);
    }
    
    this.logger.log(`Client ${client.id} a quitté ${roomName}`);
  }

  /**
   * Émettre une mise à jour de compartiment.
   */
  emitCompartmentUpdate(lockerId: string, data: {
    shelfNo: string;
    status: string;
    parcelId?: string;
  }) {
    const event = 'compartment:update';
    const roomName = `locker:${lockerId}`;
    
    this.server.to(roomName).emit(event, {
      ...data,
      lockerId,
      timestamp: new Date().toISOString(),
    });
    
    this.logger.debug(`Émission ${event} -> ${roomName}: ${data.shelfNo}=${data.status}`);
  }

  /**
   * Émettre une alerte.
   */
  emitAlert(lockerId: string, alert: {
    type: 'info' | 'warning' | 'error' | 'success';
    message: string;
    details?: any;
  }) {
    const event = 'alert';
    const roomName = `locker:${lockerId}`;
    
    this.server.to(roomName).emit(event, {
      ...alert,
      lockerId,
      timestamp: new Date().toISOString(),
    });
    
    this.logger.log(`Alerte ${alert.type} -> ${roomName}: ${alert.message}`);
  }

  /**
   * Émettre une mise à jour des statistiques.
   */
  emitStatsUpdate(lockerId: string, stats: {
    total: number;
    occupied: number;
    available: number;
    maintenance: number;
    error: number;
    occupancyRate: number;
  }) {
    const event = 'stats:update';
    const roomName = `locker:${lockerId}`;
    
    this.server.to(roomName).emit(event, {
      ...stats,
      lockerId,
      timestamp: new Date().toISOString(),
    });
    
    this.logger.debug(`Émission ${event} -> ${roomName}: occupancy=${stats.occupancyRate.toFixed(1)}%`);
  }

  /**
   * Diffuser un message à tous les clients connectés.
   */
  broadcast(event: string, data: any) {
    this.server.emit(event, {
      ...data,
      timestamp: new Date().toISOString(),
    });
    
    this.logger.debug(`Broadcast ${event} à tous les clients`);
  }

  /**
   * Obtenir le nombre de clients connectés.
   */
  getConnectedClientsCount(): number {
    return this.server.sockets.sockets.size;
  }

  /**
   * Obtenir la liste des rooms actives.
   */
  getActiveRooms(): string[] {
    const rooms = this.server.sockets.adapter.rooms;
    const activeRooms: string[] = [];
    
    rooms.forEach((_, roomName) => {
      // Ignorer les rooms qui sont des IDs de socket
      if (!roomName.startsWith('locker:')) return;
      activeRooms.push(roomName);
    });
    
    return activeRooms;
  }
}