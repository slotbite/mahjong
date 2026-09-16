"""Servidor estático de vista previa sin caché (para iterar por wifi sin recargas forzadas).

Uso: python tools/serve.py [puerto]   (por defecto 8080, escucha en 0.0.0.0)
"""
import os
import sys
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer


class NoCacheHandler(SimpleHTTPRequestHandler):
    extensions_map = {
        **SimpleHTTPRequestHandler.extensions_map,
        ".js": "text/javascript",
        ".mjs": "text/javascript",
        ".json": "application/json",
        ".webp": "image/webp",
        ".ogg": "audio/ogg",
        ".m4a": "audio/mp4",
        ".wasm": "application/wasm",
    }

    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    def log_message(self, fmt, *args):
        # Solo errores y 404, para no inundar la consola.
        if len(args) >= 2 and str(args[1]).startswith(("4", "5")):
            super().log_message(fmt, *args)


def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8080
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    handler = partial(NoCacheHandler, directory=root)
    with ThreadingHTTPServer(("0.0.0.0", port), handler) as httpd:
        print(f"Memorice Cozy sin cache en http://0.0.0.0:{port}/ (raiz: {root})")
        httpd.serve_forever()


if __name__ == "__main__":
    main()
