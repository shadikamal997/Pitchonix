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
import { JwtService } from '@nestjs/jwt';

interface PresenceUser {
  userId: string;
  name: string;
  email: string;
  color: string;
}

const COLORS = ['#7C3AED', '#2563EB', '#059669', '#D97706', '#DC2626', '#7C3AED', '#DB2777'];

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/presence',
})
export class PresenceGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  // documentId → Set of socket ids
  private rooms = new Map<string, Map<string, PresenceUser>>();
  // socketId → { documentId, userId }
  private socketMap = new Map<string, { documentId: string; user: PresenceUser }>();

  constructor(private jwtService: JwtService) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token as string;
      if (!token) { client.disconnect(); return; }
      this.jwtService.verify(token, {
        secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production',
      });
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const entry = this.socketMap.get(client.id);
    if (!entry) return;
    const { documentId } = entry;
    const room = this.rooms.get(documentId);
    if (room) {
      room.delete(client.id);
      if (room.size === 0) this.rooms.delete(documentId);
      else this.server.to(documentId).emit('presence:update', Array.from(room.values()));
    }
    this.socketMap.delete(client.id);
  }

  @SubscribeMessage('presence:join')
  handleJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { documentId: string; name: string; email: string },
  ) {
    const { documentId, name, email } = data;
    const token = client.handshake.auth?.token as string;
    let userId = 'anon';
    try {
      const payload: any = this.jwtService.decode(token);
      userId = payload?.sub ?? 'anon';
    } catch {}

    const colorIndex = (this.rooms.get(documentId)?.size ?? 0) % COLORS.length;
    const user: PresenceUser = { userId, name: name || email, email, color: COLORS[colorIndex] };

    if (!this.rooms.has(documentId)) this.rooms.set(documentId, new Map());
    this.rooms.get(documentId)!.set(client.id, user);
    this.socketMap.set(client.id, { documentId, user });

    client.join(documentId);
    this.server.to(documentId).emit('presence:update', Array.from(this.rooms.get(documentId)!.values()));
  }

  @SubscribeMessage('presence:leave')
  handleLeave(@ConnectedSocket() client: Socket) {
    this.handleDisconnect(client);
  }
}
