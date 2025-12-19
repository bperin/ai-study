import { WebSocketGateway, WebSocketServer, SubscribeMessage, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class PdfStatusGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('ping')
  handlePing(client: Socket, data: any) {
    console.log(`Ping received from ${client.id}:`, data);
    return { event: 'pong', data };
  }

  sendStatusUpdate(userId: string, status: {
    isGenerating: boolean;
    type?: 'flashcards' | 'ingestion';
    message?: string;
    progress?: {
      current: number;
      total: number;
    }
  }) {
    console.log(`Sending status update for user ${userId}:`, status);
    this.server.emit(`status:${userId}`, status);
  }
}
