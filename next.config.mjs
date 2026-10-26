/** @type {import('next').NextConfig} */
export default {
  webpack: (config, { isServer, webpack }) => {
    // The PowerPoint library (pptxgenjs) can also run on a server and so mentions Node's own modules. In the browser
    // it never uses them, so point those names at nothing instead of failing the build.
    if (!isServer) {
      config.plugins.push(
        new webpack.NormalModuleReplacementPlugin(/^node:/, (resource) => {
          resource.request = resource.request.replace(/^node:/, "");
        }),
      );
      config.resolve.fallback = { ...config.resolve.fallback, fs: false, https: false, os: false, path: false };
    }
    return config;
  },
};
