import { Container, getContainer } from '@cloudflare/containers';

export class AppContainer extends Container {
  defaultPort = 8000;
  sleepAfter = '10m';
  enableInternet = true;
}

export default {
  async fetch(request: Request, env: { CONTAINER: DurableObjectNamespace<AppContainer> }) {
    const container = getContainer(env.CONTAINER);
    return container.fetch(request);
  },
};
