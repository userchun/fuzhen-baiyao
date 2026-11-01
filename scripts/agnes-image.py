#!/usr/bin/env python3
"""直连 Agnes 出图（文生图 / 带参考图），不经过 Magpie。

接口见 https://wiki.agnes-ai.com/en/docs/agnes-image-25-flash.md ：
POST https://apihub.agnes-ai.com/v1/images/generations，参考图放 extra_body.image（data URI）。

密钥读取顺序：环境变量 AGNES_API_KEY，否则 ~/.config/agnes/api_key。密钥不要放进仓库。

用法：
  python3 scripts/agnes-image.py --prompt-file p.txt --ref ref.png --size 2K --ratio 9:16 --out out.png
"""
import argparse
import base64
import json
import mimetypes
import os
import sys
import time
import urllib.error
import urllib.request

API = "https://apihub.agnes-ai.com/v1/images/generations"
KEY_FILE = os.path.expanduser("~/.config/agnes/api_key")


def read_key() -> str:
    key = os.environ.get("AGNES_API_KEY", "").strip()
    if not key and os.path.exists(KEY_FILE):
        with open(KEY_FILE) as f:
            key = f.read().strip()
    if not key:
        sys.exit(f"没有密钥：设置 AGNES_API_KEY 或写入 {KEY_FILE}")
    return key


def data_uri(path: str) -> str:
    mime = mimetypes.guess_type(path)[0] or "image/png"
    with open(path, "rb") as f:
        return f"data:{mime};base64," + base64.b64encode(f.read()).decode()


def post(body: dict, key: str, retries: int) -> dict:
    data = json.dumps(body).encode()
    delay = 1
    for attempt in range(retries + 1):
        req = urllib.request.Request(API, data=data, method="POST", headers={
            "Authorization": f"Bearer {key}", "Content-Type": "application/json"})
        try:
            with urllib.request.urlopen(req, timeout=360) as r:
                return json.load(r)
        except urllib.error.HTTPError as e:
            msg = e.read().decode(errors="replace")[:500]
            # 5xx 和 429 按文档指数退避重试，其余直接报错
            if (e.code >= 500 or e.code == 429) and attempt < retries:
                print(f"{e.code}，{delay}s 后重试：{msg}", file=sys.stderr)
                time.sleep(delay)
                delay *= 2
                continue
            sys.exit(f"HTTP {e.code}: {msg}")
    sys.exit("重试用完")


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    g = ap.add_mutually_exclusive_group(required=True)
    g.add_argument("--prompt")
    g.add_argument("--prompt-file")
    ap.add_argument("--ref", action="append", default=[], help="参考图路径，可多次")
    ap.add_argument("--model", default="agnes-image-2.5-flash")
    ap.add_argument("--size", default="2K", help="1K / 2K / 3K / 4K")
    ap.add_argument("--ratio", default="9:16", help="1:1 3:4 4:3 16:9 9:16 2:3 3:2 21:9")
    ap.add_argument("--out", required=True)
    ap.add_argument("--retries", type=int, default=3)
    a = ap.parse_args()

    prompt = a.prompt if a.prompt else open(a.prompt_file).read().strip()
    extra = {"response_format": "url"}
    if a.ref:
        extra["image"] = [data_uri(p) for p in a.ref]
    body = {"model": a.model, "prompt": prompt, "size": a.size, "ratio": a.ratio, "extra_body": extra}

    res = post(body, read_key(), a.retries)
    item = (res.get("data") or [{}])[0]
    os.makedirs(os.path.dirname(os.path.abspath(a.out)), exist_ok=True)
    if item.get("b64_json"):
        with open(a.out, "wb") as f:
            f.write(base64.b64decode(item["b64_json"]))
    elif item.get("url"):
        urllib.request.urlretrieve(item["url"], a.out)
    else:
        sys.exit("返回里没有图片：" + json.dumps(res)[:500])
    print(a.out)


if __name__ == "__main__":
    main()
