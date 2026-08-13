import { MessageEvent } from '@nestjs/common';
import { Observable } from 'rxjs';
import { INotificationsService } from './notifications.service.interface';

/**
 * Abstract class representing common notification functionalities.
 * This class should be extended by any notification service implementation.
 *
 * @implements {INotificationsService}
 */
abstract class CommonNotifications implements INotificationsService {
  abstract connect(): Observable<MessageEvent>;
  abstract sendMessageToClient(clientId: string, message: string): void;
  abstract disconnect(clientId: string): void;
  abstract broadcast(message: object): void;
}

export { CommonNotifications };
