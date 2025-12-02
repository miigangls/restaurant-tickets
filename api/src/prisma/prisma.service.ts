import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor(private configService: ConfigService) {
    super();
  }

  async onModuleInit() {
    try {
      await this.$connect();

      // Extract database connection info from DATABASE_URL
      const databaseUrl = this.configService.get<string>('DATABASE_URL');
      if (databaseUrl) {
        const url = new URL(databaseUrl.replace(/^postgresql:\/\//, 'http://'));
        const host = url.hostname;
        const port = url.port || '5432';
        const database = url.pathname.split('/')[1]?.split('?')[0] || 'unknown';

        this.logger.log('✅ Database connection established successfully');
        this.logger.log(`📍 Host: ${host}`);
        this.logger.log(`🔌 Port: ${port}`);
        this.logger.log(`💾 Database: ${database}`);
        this.logger.log(`🔗 Connection status: CONNECTED`);
      } else {
        this.logger.log('✅ Database connection established successfully');
      }
    } catch (error) {
      this.logger.error('❌ Failed to connect to database', error);
      throw error;
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('🔌 Database connection closed');
  }
}
