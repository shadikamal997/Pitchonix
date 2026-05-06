import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

export interface ProgressUpdate {
  jobId: string;
  stage: 'outline' | 'slides' | 'design' | 'quality' | 'complete' | 'error';
  progress: number; // 0-100
  message: string;
  details?: {
    currentSlide?: number;
    totalSlides?: number;
    slideTitle?: string;
    [key: string]: any;
  };
  timestamp: Date;
}

@WebSocketGateway({
  cors: {
    origin: ['http://localhost:3001', 'http://localhost:3000'],
    credentials: true,
  },
  namespace: '/progress',
})
export class ProgressGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ProgressGateway.name);
  private readonly jobSubscriptions = new Map<string, Set<string>>(); // jobId -> Set of socketIds

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    
    // Remove client from all job subscriptions
    this.jobSubscriptions.forEach((subscribers, jobId) => {
      subscribers.delete(client.id);
      if (subscribers.size === 0) {
        this.jobSubscriptions.delete(jobId);
      }
    });
  }

  /**
   * Subscribe a client to progress updates for a specific job
   */
  subscribeToJob(socketId: string, jobId: string) {
    if (!this.jobSubscriptions.has(jobId)) {
      this.jobSubscriptions.set(jobId, new Set());
    }
    this.jobSubscriptions.get(jobId).add(socketId);
    this.logger.log(`Socket ${socketId} subscribed to job ${jobId}`);
  }

  /**
   * Unsubscribe a client from a job
   */
  unsubscribeFromJob(socketId: string, jobId: string) {
    const subscribers = this.jobSubscriptions.get(jobId);
    if (subscribers) {
      subscribers.delete(socketId);
      if (subscribers.size === 0) {
        this.jobSubscriptions.delete(jobId);
      }
    }
    this.logger.log(`Socket ${socketId} unsubscribed from job ${jobId}`);
  }

  /**
   * Emit progress update to all clients subscribed to this job
   */
  emitProgress(update: ProgressUpdate) {
    const subscribers = this.jobSubscriptions.get(update.jobId);
    
    if (!subscribers || subscribers.size === 0) {
      this.logger.debug(`No subscribers for job ${update.jobId}`);
      return;
    }

    this.logger.log(
      `Emitting progress for job ${update.jobId}: ${update.stage} - ${update.progress}% - ${update.message}`
    );

    // Emit to all subscribed clients
    subscribers.forEach(socketId => {
      this.server.to(socketId).emit('progress', update);
    });

    // If complete or error, clean up subscriptions
    if (update.stage === 'complete' || update.stage === 'error') {
      this.logger.log(`Job ${update.jobId} finished, cleaning up subscriptions`);
      this.jobSubscriptions.delete(update.jobId);
    }
  }

  /**
   * Emit progress to a specific room/job
   */
  emitToRoom(jobId: string, event: string, data: any) {
    this.server.to(`job-${jobId}`).emit(event, data);
  }

  /**
   * Get active job subscriptions count
   */
  getActiveJobsCount(): number {
    return this.jobSubscriptions.size;
  }

  /**
   * Get subscribers count for a job
   */
  getJobSubscribersCount(jobId: string): number {
    return this.jobSubscriptions.get(jobId)?.size || 0;
  }
}
