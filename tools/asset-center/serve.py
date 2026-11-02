"""素材中心本地服务；刷新索引时扫描最新文件，默认只监听本机。"""
import argparse
import contextlib
import io
import os
import runpy
import threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[2]
lock = threading.Lock()
class Handler(SimpleHTTPRequestHandler):
    def do_GET(self):
        if urlsplit(self.path).path == '/tools/asset-center/catalog.json':
            with lock, contextlib.redirect_stdout(io.StringIO()):
                runpy.run_path(str(ROOT/'tools/asset-center/build_catalog.py'))
        super().do_GET()
    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache')
        super().end_headers()

if __name__ == '__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--port',type=int,default=8770);args=parser.parse_args()
    os.chdir(ROOT)
    print(f'素材中心：http://127.0.0.1:{args.port}/tools/asset-center/',flush=True)
    ThreadingHTTPServer(('127.0.0.1',args.port),Handler).serve_forever()
