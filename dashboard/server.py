"""
GrimmGear Dashboard Server
Serves the dashboard and proxies API requests to arr services,
solving CORS issues when accessing multiple services from one page.

Usage: python server.py [port]
Default port: 3333
"""

import http.server
import json
import os
import sys
import urllib.request
import urllib.error
from urllib.parse import urlparse, parse_qs

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 3333
DASHBOARD_DIR = os.path.dirname(os.path.abspath(__file__))

# Service routing table
SERVICES = {
    'sonarr':      'http://localhost:8989',
    'radarr':      'http://localhost:7878',
    'lidarr':      'http://localhost:8686',
    'readarr':     'http://localhost:8787',
    'prowlarr':    'http://localhost:9696',
    'qbit':        'http://localhost:8081',
    'plex':        'http://localhost:32400',
    'flaresolverr': 'http://localhost:8191',
}


class DashboardHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DASHBOARD_DIR, **kwargs)

    def do_GET(self):
        # Proxy API requests: /api/{service}/{path}
        if self.path.startswith('/api/'):
            self._proxy_request('GET')
            return
        super().do_GET()

    def do_POST(self):
        if self.path.startswith('/api/'):
            self._proxy_request('POST')
            return
        self.send_error(405)

    def do_PUT(self):
        if self.path.startswith('/api/'):
            self._proxy_request('PUT')
            return
        self.send_error(405)

    def do_DELETE(self):
        if self.path.startswith('/api/'):
            self._proxy_request('DELETE')
            return
        self.send_error(405)

    def _proxy_request(self, method):
        """Proxy /api/{service}/... to the actual service"""
        parts = self.path.split('/', 3)  # ['', 'api', 'service', 'rest']
        if len(parts) < 3:
            self.send_error(400, 'Invalid proxy path')
            return

        service = parts[2].split('?')[0]
        rest = '/' + parts[3] if len(parts) > 3 else '/'

        # Reconstruct query string
        if '?' in self.path:
            query = self.path.split('?', 1)[1]
            # Strip service from query if it leaked
            rest_base = rest.split('?')[0]
            rest = rest_base + '?' + query

        base_url = SERVICES.get(service)
        if not base_url:
            self.send_error(404, f'Unknown service: {service}')
            return

        target_url = base_url + rest

        # Build headers (forward API keys)
        headers = {}
        for key in ['X-Api-Key', 'X-Plex-Token', 'Content-Type', 'Accept']:
            val = self.headers.get(key)
            if val:
                headers[key] = val

        # Read body for POST/PUT
        body = None
        content_length = self.headers.get('Content-Length')
        if content_length:
            body = self.rfile.read(int(content_length))

        try:
            req = urllib.request.Request(target_url, data=body, headers=headers, method=method)
            with urllib.request.urlopen(req, timeout=10) as resp:
                data = resp.read()
                self.send_response(resp.status)
                self.send_header('Content-Type', resp.headers.get('Content-Type', 'application/json'))
                self.send_header('Access-Control-Allow-Origin', '*')
                self.send_header('Content-Length', len(data))
                self.end_headers()
                self.wfile.write(data)
        except urllib.error.HTTPError as e:
            data = e.read() if hasattr(e, 'read') else b''
            self.send_response(e.code)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(data)
        except Exception as e:
            self.send_response(502)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({'error': str(e)}).encode())

    def do_OPTIONS(self):
        """Handle CORS preflight"""
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'X-Api-Key, X-Plex-Token, Content-Type, Accept')
        self.end_headers()

    def log_message(self, format, *args):
        # Quieter logging - only errors
        if args and '404' in str(args[0]):
            super().log_message(format, *args)


if __name__ == '__main__':
    print(f'GrimmGear Dashboard — http://localhost:{PORT}')
    print(f'Proxying to: {", ".join(SERVICES.keys())}')
    print(f'Serving files from: {DASHBOARD_DIR}')
    server = http.server.HTTPServer(('0.0.0.0', PORT), DashboardHandler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print('\nShutting down.')
        server.shutdown()
