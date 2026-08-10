import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  resolve: {
    alias: {
      // `server-only` não é pacote instalado: quem resolve esse import é o
      // próprio Next, que o aliasa no build para um stub compilado — vazio na
      // camada de servidor. O vitest não conhece esse alias, então qualquer
      // suíte que alcançasse src/lib/openai.ts falhava ao CARREGAR. Era o
      // caso de report-generator.test.ts, cujos testes nunca chegaram a rodar.
      // Aqui espelhamos a camada de servidor, que é onde os testes rodam
      // (environment: 'node').
      'server-only': 'next/dist/compiled/server-only/empty.js',
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
