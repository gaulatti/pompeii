const globalScope = self as unknown as SharedWorkerGlobalScope;

interface SSEPayload {
  data?: string;
  error?: any;
}

const ports: MessagePort[] = [];
let eventSource: EventSource | null = null;

function initEventSource(): void {
  if (eventSource) return;

  const sseUrl = globalScope.location.origin.includes('localhost')
    ? `http://localhost:${import.meta.env.VITE_API_PORT}/notifications`
    : `${import.meta.env.VITE_API_FQDN}/notifications`;

  eventSource = new EventSource(sseUrl);

  eventSource.onmessage = (event: MessageEvent) => {
    ports.forEach((port) => {
      port.postMessage({ data: event.data } as SSEPayload);
    });
  };

  eventSource.onerror = (err: Event) => {
    ports.forEach((port) => {
      port.postMessage({ error: err } as SSEPayload);
    });
  };
}

globalScope.onconnect = (e: MessageEvent) => {
  const port = e.ports[0];
  ports.push(port);
  port.start();

  if (!eventSource) {
    initEventSource();
  }

  port.onmessage = (msg) => {};
};
