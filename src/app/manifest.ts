import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'FluentCopilot',
    short_name: 'FluentCopilot',
    description: 'Guided language learning with practical outcomes',
    start_url: '/',
    display: 'standalone',
    background_color: '#f9fafb',
    theme_color: '#0ea5e9',
    icons: [
      {
        src: '/favicon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
      },
    ],
  }
}
