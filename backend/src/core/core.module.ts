import { Module } from '@nestjs/common';
import { NotificationsController } from './notifications/notifications.controller';
import { NotificationsService } from './notifications/notifications.service';
import { CloudWatchService } from './cloudwatch/cloudwatch.service';

@Module({
  providers: [NotificationsService, CloudWatchService],
  controllers: [NotificationsController],
  exports: [NotificationsService],
})
export class CoreModule {}
