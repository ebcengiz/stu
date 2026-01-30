/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
      },
    ],
  },
  // Webpack config to define constants
  webpack: (config, { webpack }) => {
    config.plugins.push(
      new webpack.DefinePlugin({
        'process.env.NEXT_PUBLIC_SUPABASE_URL': JSON.stringify(
          process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://wijpibmbxhioaohhgnqu.supabase.co'
        ),
        'process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY': JSON.stringify(
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndpanBpYm1ieGhpb2FvaGhnbnF1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2MDM1ODQsImV4cCI6MjA4NTE3OTU4NH0.Z9pmOxIIYVxwYyXYz9vSD_n6VProfY3EZvL1FRFgeHA'
        ),
      })
    )
    return config
  },
}

module.exports = nextConfig
