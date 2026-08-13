import { Controller, MessageEvent, Sse } from '@nestjs/common';
import { Observable } from 'rxjs';
import { Public } from 'src/decorators/public.decorator';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  /**
   * Establishes a connection to the notifications service and returns an observable
   * that emits MessageEvent objects.
   *
   * @returns {Observable<MessageEvent>} An observable that emits MessageEvent objects.
   */
  @Sse()
  @Public()
  connect(): Observable<MessageEvent> {
    return this.notificationsService.connect();
  }
}
