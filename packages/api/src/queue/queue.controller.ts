import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import { QueueService } from './queue.service';

@Controller('queue')
export class QueueController {
  constructor(private readonly queueService: QueueService) {}

  @Get(':queueName/jobs/:jobId')
  async getJobStatus(
    @Param('queueName') queueName: string,
    @Param('jobId') jobId: string,
  ) {
    const jobState = await this.queueService.getJobState(queueName, jobId);
    
    if (!jobState) {
      throw new NotFoundException(`Job ${jobId} not found in queue ${queueName}`);
    }

    return jobState;
  }
}
