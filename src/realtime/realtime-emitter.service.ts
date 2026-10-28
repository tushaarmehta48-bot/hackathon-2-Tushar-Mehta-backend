import { Injectable } from '@nestjs/common';
import type { Server } from 'socket.io';

export type CheckInUpdatePayload = {
  eventId: string;
  checkedInTotal: number;
  result: string;
};

export type InventoryUpdatePayload = {
  eventId: string;
  ticketsRemaining: number;
  isSoldOut: boolean;
};

@Injectable()
export class RealtimeEmitterService {
  private server?: Server;

  bindServer(server: Server) {
    this.server = server;
  }

  emitCheckInUpdate(payload: CheckInUpdatePayload) {
    if (!this.server) {
      return;
    }
    this.server.to(`event:${payload.eventId}`).emit('check-in:update', payload);
    this.server.to('admin').emit('check-in:update', payload);
  }

  emitInventoryUpdate(payload: InventoryUpdatePayload) {
    if (!this.server) {
      return;
    }
    this.server.to(`event:${payload.eventId}`).emit('inventory:update', payload);
    this.server.to('admin').emit('inventory:update', payload);
  }
}
