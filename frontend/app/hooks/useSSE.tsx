import { useEffect, useState } from 'react';

/**
 * Custom hook to handle Server-Sent Events (SSE) using a SharedWorker.
 *
 * This hook sets up a SharedWorker to listen for SSE messages and updates the state with the received messages or errors.
 *
 * @returns {Object} An object containing:
 * - `messages`: An array of strings representing the received messages.
 * - `error`: Any error that occurred during the SSE connection.
 *
 * @example
 * const { messages, error } = useSSE();
 *
 * useEffect(() => {
 *   if (error) {
 *     console.error('SSE Error:', error);
 *   }
 * }, [error]);
 *
 * return (
 *   <div>
 *     {messages.map((msg, index) => (
 *       <p key={index}>{msg}</p>
 *     ))}
 *   </div>
 * );
 */
const useSSE = () => {
    const [lastMessage, setLastMessage] = useState<string | null>();
    const [messages, setMessages] = useState<string[]>([]);
    const [error, setError] = useState<any>(null);

    useEffect(() => {
        const worker = new SharedWorker(new URL('../engines/sse.shared.ts', import.meta.url), { type: 'module' });
        worker.port.start();

        const handleMessage = (event: MessageEvent) => {
            if (event.data.error) {
                setError(event.data.error);
            } else if (event.data.data) {
                setMessages((prev) => [...prev, event.data.data]);
                setLastMessage(event.data.data);
            }
        };

        worker.port.addEventListener('message', handleMessage);

        return () => {
            worker.port.removeEventListener('message', handleMessage);
            worker.port.close();
        };
    }, []);

    return { lastMessage, messages, error };
}

export { useSSE };
