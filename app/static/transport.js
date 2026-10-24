(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory;
  else (root.M3UStudio ??= {}).createTransport = factory;
})(globalThis, function (options) {
  "use strict";
  const { request, locale, onUnauthorized, errorLabel } = options;
  return {
    async api(path, options = {}) {
      const response = await request(path, {
        ...options,
        headers: {
          "X-IPTV-Request": "1",
          "Accept-Language": locale(),
          ...options.headers,
        },
      });
      const data = await response.json();
      if (!response.ok) {
        if (response.status === 401 && !path.startsWith("/api/auth/"))
          onUnauthorized();
        const error = Error(data.error || errorLabel());
        error.status = response.status;
        error.data = data;
        throw error;
      }
      return data;
    },
  };
});
