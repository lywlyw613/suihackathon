import Pusher from 'pusher-js';

let pusherClient: Pusher | null = null;

const PUSHER_KEY = import.meta.env.VITE_PUSHER_KEY;
const PUSHER_CLUSTER = import.meta.env.VITE_PUSHER_CLUSTER || 'us2';

if (typeof window !== 'undefined' && PUSHER_KEY) {
  pusherClient = new Pusher(PUSHER_KEY, {
    cluster: PUSHER_CLUSTER,
    enabledTransports: ['ws', 'wss'],
  });
}

export { pusherClient };

