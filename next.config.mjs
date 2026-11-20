import { securityHeaders } from './config/security-headers.mjs'
import mediaImageConfig from './config/mfalujo23-media-image-config.mjs'

const nextConfig = {
  poweredByHeader: false,
  images: mediaImageConfig,
  async headers() {
    return [
      { source: '/:path*', headers: securityHeaders(process.env.NODE_ENV === 'production') },
      { source: '/api/:path*', headers: [{ key: 'Cache-Control', value: 'no-store' }] },
    ]
  },
}
export default nextConfig
