import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from './auth/public.decorator';
import { PrismaService } from './prisma/prisma.service';

@ApiTags('Health')
@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Root ping' })
  getHello(): object {
    return this.appService.getHello();
  }

  @Public()
  @Get('health')
  @ApiOperation({ summary: 'Deep health check — DB, memory, uptime' })
  async healthCheck(): Promise<object> {
    const mem  = process.memoryUsage();
    const checks: Record<string, any> = {};

    // DB probe — fast SELECT 1
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      checks.db = 'ok';
    } catch (e: any) {
      checks.db = `error: ${e?.message}`;
    }

    return {
      status:    checks.db === 'ok' ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      uptimeSec: Math.round(process.uptime()),
      checks,
      memory: {
        heapUsedMb:  Math.round(mem.heapUsed  / 1024 / 1024),
        heapTotalMb: Math.round(mem.heapTotal / 1024 / 1024),
        rssMb:       Math.round(mem.rss       / 1024 / 1024),
      },
      version: process.env.APP_VERSION || 'beta',
    };
  }
}
