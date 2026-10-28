import {
  ConnectedSocket,
  MessageBody,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { ConfigService } from '@nestjs/config';
import type { Server, Socket } from 'socket.io';
import { createSessionMiddleware } from '../common/session/create-session-middleware.js';
import { UserRole } from '../users/enums/user-role.enum.js';
import { UsersService } from '../users/users.service.js';
import { RealtimeEmitterService } from './realtime-emitter.service.js';

type JoinRoomDto = {
  room: 'admin' | `event:${string}`;
};

@WebSocketGateway({
  cors: { origin: true, credentials: true },
  namespace: '/realtime',
})
export class RealtimeGateway implements OnGatewayInit {
  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly config: ConfigService,
    private readonly usersService: UsersService,
    private readonly realtimeEmitter: RealtimeEmitterService,
  ) {}

  afterInit(server: Server) {
    this.realtimeEmitter.bindServer(server);

    const secret = this.config.get<string>('session.secret');
    const nodeEnv = this.config.get<string>('nodeEnv') ?? 'development';
    const mongoUri = this.config.get<string>('mongodb.uri');

    if (!secret) {
      return;
    }

    const sessionMiddleware = createSessionMiddleware({
      secret,
      nodeEnv,
      mongoUri,
    });

    const engineUse = (
      server.engine as
        | {
            use?: (
              middleware: (
                req: unknown,
                res: unknown,
                next: (err?: unknown) => void,
              ) => void,
            ) => void;
          }
        | undefined
    )?.use;
    if (engineUse) {
      engineUse((req, res, next) => {
        sessionMiddleware(req as never, res as never, next as never);
      });
    }
  }

  async handleConnection(client: Socket) {
    const session = (client.request as { session?: { userId?: string } }).session;
    if (!session?.userId) {
      client.disconnect(true);
      return;
    }

    const user = await this.usersService.findById(session.userId);
    if (!user) {
      client.disconnect(true);
      return;
    }

    client.data.userId = user._id.toString();
    client.data.role = user.role;
  }

  @SubscribeMessage('join')
  async join(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: JoinRoomDto,
  ) {
    const role = client.data.role as string | undefined;
    if (!role) {
      return { ok: false, reason: 'unauthenticated' };
    }

    if (body.room === 'admin') {
      if (role !== UserRole.Admin) {
        return { ok: false, reason: 'forbidden' };
      }
      await client.join('admin');
      return { ok: true, room: 'admin' };
    }

    if (body.room.startsWith('event:')) {
      if (role !== UserRole.Admin && role !== UserRole.Gatekeeper) {
        return { ok: false, reason: 'forbidden' };
      }
      await client.join(body.room);
      return { ok: true, room: body.room };
    }

    return { ok: false, reason: 'invalid_room' };
  }
}
