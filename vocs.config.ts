import { defineConfig } from 'vocs'

export default defineConfig({
  basePath: '/rollups-101-workshop',
  baseUrl: 'https://henriquemarlon.github.io',
  description: 'Rollups Workshop',
  title: 'Rollups 101',
  sidebar: [
    {
      text: 'Getting Started',
      link: '/getting-started',
    },
    {
      text: 'Example',
      link: '/example',
    },
  ],
})
