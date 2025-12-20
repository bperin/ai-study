import { WebSocketGateway, WebSocketServer, SubscribeMessage, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

export interface PdfStatusUpdate {
  isGenerating?: boolean;
  type?: 'flashcards' | 'ingestion' | string;
  phase?: 'chunking' | 'flashcards' | string;
  status?: 'running' | 'completed' | 'failed';
  message?: string;
  progress?: number | { current: number; total: number };
  current?: number;
  total?: number;
  pdfId?: string;
}

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

  sendStatusUpdate(userId: string, update: PdfStatusUpdate) {
    console.log(`Sending status update for user ${userId}:`, update);
    this.server.emit(`status:${userId}`, update);
  }
}
