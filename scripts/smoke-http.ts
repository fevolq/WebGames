import { games } from '../src/catalog/games';
import { checkDeployment } from './check-deployment';

try {
  const result = await checkDeployment({
    baseUrl: process.env.TEST_BASE_URL ?? 'http://127.0.0.1:8080',
    buildDir: process.env.TEST_BUILD_DIR ?? 'dist',
    catalog: games,
    log: console.log,
  });
  console.log(`Deployment checks passed: ${result.assets} build assets (including lazy chunks), ${result.covers} covers.`);
} catch (error) {
  console.error('Deployment check failed. Use the build artifacts matching the deployed version.');
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
