using System;
using System.Net;
using NLog;
using NzbDrone.Common.Http;

namespace NzbDrone.Core.Http
{
    public interface ICachedHttpResponseService
    {
        HttpResponse Get(HttpRequest request, bool useCache, TimeSpan ttl);
        HttpResponse<T> Get<T>(HttpRequest request, bool useCache, TimeSpan ttl)
            where T : new();
    }

    public class CachedHttpResponseService : ICachedHttpResponseService
    {
        private readonly ICachedHttpResponseRepository _repo;
        private readonly IHttpClient _httpClient;
        private readonly Logger _logger;

        public CachedHttpResponseService(ICachedHttpResponseRepository httpResponseRepository,
                                         IHttpClient httpClient,
                                         Logger logger)
        {
            _repo = httpResponseRepository;
            _httpClient = httpClient;
            _logger = logger;
        }

        public HttpResponse Get(HttpRequest request, bool useCache, TimeSpan ttl)
        {
            var cached = _repo.FindByUrl(request.Url.ToString());

            if (useCache && cached != null && cached.Expiry > DateTime.UtcNow)
            {
                _logger.Trace($"Returning cached response for [GET] {request.Url}");
                return new HttpResponse(request, new HttpHeader(), cached.Value, (HttpStatusCode)cached.StatusCode);
            }

            try
            {
                var result = _httpClient.Get(request);

                if (!result.HasHttpError)
                {
                    if (cached == null)
                    {
                        cached = new CachedHttpResponse
                        {
                            Url = request.Url.ToString(),
                        };
                    }

                    var now = DateTime.UtcNow;

                    cached.LastRefresh = now;
                    cached.Expiry = now.Add(ttl);
                    cached.Value = result.Content;
                    cached.StatusCode = (int)result.StatusCode;

                    _repo.Upsert(cached);
                }

                return result;
            }
            catch (Exception ex) when (cached != null && cached.Value != null)
            {
                // Stale-on-error: if the live fetch fails (DNS resolution, connection
                // timeout, etc.) but we have a previously cached response, serve it
                // rather than failing the entire operation. This prevents metadata
                // service outages (e.g., api.bookinfo.club being down) from blocking
                // all author adds and refreshes.
                _logger.Warn(ex, "Live fetch failed for {0}, serving stale cached response (cached at {1})", request.Url, cached.LastRefresh);
                return new HttpResponse(request, new HttpHeader(), cached.Value, (HttpStatusCode)cached.StatusCode);
            }
        }

        public HttpResponse<T> Get<T>(HttpRequest request, bool useCache, TimeSpan ttl)
            where T : new()
        {
            var response = Get(request, useCache, ttl);
            return new HttpResponse<T>(response);
        }
    }
}
