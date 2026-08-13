import { MessageEvent } from '@nestjs/common';
import { Observable } from 'rxjs';

/**
 * Interface representing a notifications service.
 */
/**
 * Interface for the Notifications Service.
 *
 * @interface INotificationsService
 *
 * @remarks
 * This interface defines the contract for a notifications service that can connect to clients,
 * send messages to specific clients, disconnect clients, and broadcast messages to all subscribers.
 */
export interface INotificationsService {
  /**
   * Establishes a connection to the notifications service and returns an observable.
   */
  connect(): Observable<MessageEvent>;

  /**
   * Sends a message to a specific client.
   *
   * @param clientId - The unique identifier of the client.
   * @param message - The message to be sent to the client.
   *
   * @remarks
   * If the client with the given `clientId` exists, the message is sent to the client.
   * Otherwise, an error is logged to the console indicating that the client was not found.
   */
  sendMessageToClient(clientId: string, message: string): void;

  /**
   * Disconnects a client by their client ID.
   *
   * @param clientId - The unique identifier of the client to disconnect.
   *
   * @remarks
   * This method removes the client from the clients list if they exist and logs the disconnection.
   * If the client does not exist, it logs that the client was not found for disconnection.
   */
  disconnect(clientId: string): void;

  /**
   * Broadcasts a message to all subscribers of the global subject.
   *
   * @param message - The message to be broadcasted.
   */
  broadcast(message: object): void;
}
