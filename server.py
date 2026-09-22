#!/usr/bin/env python3
"""KINSEI — static site + form leads + Telegram analytics bot."""

from __future__ import annotations

import json
import os
import re
import sys
import threading
import time
from datetime import datetime, timedelta, timezone
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urlparse
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parent
DATA_FILE = ROOT / "data" / "kinsei.json"
TASHKENT = timezone(timedelta(hours=5))
MAX_HITS = 4000
MAX_LEADS = 300
HIT_DEDUP_SEC = 25

REPLY_KEYBOARD = {
    "keyboard": [
        [{"text": "📊 Analytics"}, {"text": "📅 Today"}],
        [{"text": "📬 Leads"}],
    ],
    "resize_keyboard": True,
    "is_persistent": True,
}

BUTTON_ALIASES = {
    "📊 analytics": "analytics",
    "analytics": "analytics",
    "/analytics": "analytics",
    "/stats": "analytics",
    "📅 today": "today",
    "today": "today",
    "/today": "today",
    "📬 leads": "leads",
    "leads": "leads",
    "/leads": "leads",
    "/start": "start",
    "/help": "start",
    "start": "start",
}

lock = threading.Lock()
TOKEN = ""
CHAT_ID = "6832614745"


def load_env():
    path = ROOT / ".env"
    if not path.exists():
        return
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, val = line.split("=", 1)
        os.environ.setdefault(key.strip(), val.strip().strip('"').strip("'"))


def now_tashkent() -> datetime:
    return datetime.now(TASHKENT)


def iso_now() -> str:
    return now_tashkent().isoformat(timespec="seconds")


def esc(value) -> str:
    return (
        str(value or "")
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
    )


def empty_store() -> dict:
    return {"hits": [], "leads": [], "welcome_sent": False, "update_offset": 0}


def read_store() -> dict:
    if not DATA_FILE.exists():
        return empty_store()
    try:
        data = json.loads(DATA_FILE.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return empty_store()
    data.setdefault("hits", [])
    data.setdefault("leads", [])
    data.setdefault("welcome_sent", False)
    data.setdefault("update_offset", 0)
    return data


def write_store(data: dict) -> None:
    DATA_FILE.parent.mkdir(parents=True, exist_ok=True)
    tmp = DATA_FILE.with_suffix(".tmp")
    tmp.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    tmp.replace(DATA_FILE)


def telegram(method: str, payload: dict | None = None, timeout: int = 40) -> dict:
    if not TOKEN:
        return {"ok": False, "description": "Missing bot token"}
    url = f"https://api.telegram.org/bot{TOKEN}/{method}"
    body = json.dumps(payload or {}).encode("utf-8")
    req = Request(url, data=body, headers={"Content-Type": "application/json"}, method="POST")
    try:
        with urlopen(req, timeout=timeout) as res:
            return json.loads(res.read().decode("utf-8"))
    except HTTPError as err:
        raw = err.read().decode("utf-8", errors="replace")
        try:
            return json.loads(raw)
        except json.JSONDecodeError:
            return {"ok": False, "description": raw or str(err)}
    except (URLError, TimeoutError, json.JSONDecodeError) as err:
        return {"ok": False, "description": str(err)}


def send_message(text: str, reply_markup=None, chat_id: str | None = None) -> dict:
    payload = {
        "chat_id": chat_id or CHAT_ID,
        "text": text,
        "parse_mode": "HTML",
        "disable_web_page_preview": True,
    }
    if reply_markup is not None:
        payload["reply_markup"] = reply_markup
    return telegram("sendMessage", payload, timeout=20)


def is_owner(update_chat_id) -> bool:
    return str(update_chat_id) == str(CHAT_ID)


def parse_dt(value: str) -> datetime | None:
    if not value:
        return None
    try:
        dt = datetime.fromisoformat(value)
    except ValueError:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=TASHKENT)
    return dt.astimezone(TASHKENT)


def host_of(url: str) -> str:
    if not url:
        return "direct"
    try:
        host = (urlparse(url).hostname or "").lower()
    except ValueError:
        return "direct"
    if not host or host in {"localhost", "127.0.0.1"} or host.startswith("172.") or host.startswith("192.168."):
        return "direct"
    if host.startswith("www."):
        host = host[4:]
    return host or "direct"


def device_of(hit: dict) -> str:
    ua = str(hit.get("ua") or "").lower()
    width = hit.get("w")
    if "mobile" in ua or "iphone" in ua or "android" in ua:
        return "phone"
    if isinstance(width, (int, float)) and width <= 860:
        return "phone"
    return "desktop"


def start_of_today() -> datetime:
    n = now_tashkent()
    return n.replace(hour=0, minute=0, second=0, microsecond=0)


def filter_since(rows: list, start: datetime | None) -> list:
    if start is None:
        return rows
    out = []
    for row in rows:
        dt = parse_dt(row.get("t") or "")
        if dt and dt >= start:
            out.append(row)
    return out


def summarize(period: str) -> str:
    with lock:
        store = read_store()
        hits = list(store["hits"])
        leads = list(store["leads"])

    start = start_of_today() if period == "today" else None
    hits = filter_since(hits, start)
    leads = filter_since(leads, start)

    uniques = {h.get("vid") for h in hits if h.get("vid")}
    devices = {"phone": 0, "desktop": 0}
    langs = {}
    refs = {}
    for hit in hits:
        devices[device_of(hit)] = devices.get(device_of(hit), 0) + 1
        lang = str(hit.get("lang") or "uz").upper()
        langs[lang] = langs.get(lang, 0) + 1
        ref = host_of(hit.get("ref") or "")
        refs[ref] = refs.get(ref, 0) + 1

    title = "Today" if period == "today" else "All time"
    stamp = now_tashkent().strftime("%d.%m.%Y %H:%M")
    lines = [
        f"<b>KINSEI · {esc(title)}</b>",
        f"<i>{esc(stamp)} · Toshkent</i>",
        "",
        f"👁 Views: <b>{len(hits)}</b>",
        f"👤 Unique visitors: <b>{len(uniques)}</b>",
        f"📝 Leads: <b>{len(leads)}</b>",
        "",
        f"📱 Phone: {devices['phone']}   💻 Desktop: {devices['desktop']}",
    ]
    if langs:
        lang_bits = " · ".join(f"{k} {v}" for k, v in sorted(langs.items(), key=lambda kv: -kv[1]))
        lines.append(f"🌐 {esc(lang_bits)}")
    if refs:
        lines.append("")
        lines.append("<b>Referrers</b>")
        for name, count in sorted(refs.items(), key=lambda kv: -kv[1])[:6]:
            lines.append(f"· {esc(name)} — {count}")
    return "\n".join(lines)


def format_leads() -> str:
    with lock:
        leads = list(read_store()["leads"])
    if not leads:
        return "<b>KINSEI · Leads</b>\n\nNo form submissions yet."
    latest = list(reversed(leads[-12:]))
    lines = [f"<b>KINSEI · Leads</b> <i>({len(leads)} total)</i>", ""]
    for lead in latest:
        when = parse_dt(lead.get("t") or "")
        clock = when.strftime("%d.%m %H:%M") if when else "—"
        service = lead.get("serviceLabel") or lead.get("service") or "—"
        lines.append(f"<b>{esc(lead.get('name'))}</b> · {esc(clock)}")
        lines.append(f"📞 {esc(lead.get('phone'))}")
        lines.append(f"🛠 {esc(service)}")
        if lead.get("custom"):
            lines.append(f"📝 {esc(lead['custom'])}")
        lines.append("")
    return "\n".join(lines).strip()


def welcome_text() -> str:
    return (
        "<b>KINSEI bot is ready.</b>\n\n"
        "New form submissions land here.\n"
        "Use the buttons anytime for live site analytics."
    )


def handle_command(kind: str) -> str:
    if kind == "start":
        return welcome_text()
    if kind == "today":
        return summarize("today")
    if kind == "leads":
        return format_leads()
    return summarize("all")


def record_hit(body: dict) -> None:
    vid = str(body.get("vid") or "")[:80]
    now = now_tashkent()
    with lock:
        store = read_store()
        if vid:
            for hit in reversed(store["hits"]):
                if hit.get("vid") != vid:
                    continue
                prev = parse_dt(hit.get("t") or "")
                if prev and (now - prev).total_seconds() < HIT_DEDUP_SEC:
                    return
                break
        store["hits"].append(
            {
                "t": iso_now(),
                "vid": vid,
                "ref": str(body.get("ref") or "")[:400],
                "lang": str(body.get("lang") or "uz")[:8],
                "w": body.get("w") if isinstance(body.get("w"), (int, float)) else None,
                "h": body.get("h") if isinstance(body.get("h"), (int, float)) else None,
                "ua": str(body.get("ua") or "")[:180],
            }
        )
        store["hits"] = store["hits"][-MAX_HITS:]
        write_store(store)


def record_lead(body: dict) -> dict:
    name = str(body.get("name") or "").strip()[:80]
    phone = str(body.get("phone") or "").strip()[:32]
    service = str(body.get("service") or "").strip()[:40]
    service_label = str(body.get("serviceLabel") or service).strip()[:80]
    custom = str(body.get("custom") or "").strip()[:500] or None
    lang = str(body.get("lang") or "uz")[:8]
    digits = re.sub(r"\D", "", phone)
    if len(name) < 2:
        return {"ok": False, "error": "name"}
    if not (len(digits) == 12 and digits.startswith("998")):
        return {"ok": False, "error": "phone"}
    if not service:
        return {"ok": False, "error": "service"}

    lead = {
        "t": iso_now(),
        "name": name,
        "phone": phone,
        "service": service,
        "serviceLabel": service_label,
        "custom": custom,
        "lang": lang,
    }
    with lock:
        store = read_store()
        store["leads"].append(lead)
        store["leads"] = store["leads"][-MAX_LEADS:]
        write_store(store)

    lines = [
        "<b>Yangi loyiha so‘rovi (KINSEI)</b>",
        f"👤 <b>Mijoz:</b> {esc(name)}",
        f"📞 <b>Telefon:</b> {esc(phone)}",
        f"🛠 <b>Xizmat:</b> {esc(service_label)}",
    ]
    if custom:
        lines.append(f"📝 <b>Tafsilot:</b> {esc(custom)}")
    lines.append(f"⏰ <b>Vaqt:</b> {esc(now_tashkent().strftime('%d.%m.%Y %H:%M'))}")
    sent = send_message("\n".join(lines))
    if sent.get("ok"):
        return {"ok": True}
    return {"ok": False, "error": sent.get("description") or "telegram"}


def process_update(update: dict) -> None:
    callback = update.get("callback_query")
    if callback:
        from_id = (callback.get("from") or {}).get("id")
        chat_id = ((callback.get("message") or {}).get("chat") or {}).get("id") or from_id
        telegram("answerCallbackQuery", {"callback_query_id": callback.get("id")}, timeout=10)
        if not is_owner(from_id) and not is_owner(chat_id):
            return
        kind = str(callback.get("data") or "analytics")
        send_message(handle_command(kind), chat_id=str(CHAT_ID))
        return

    message = update.get("message") or update.get("edited_message")
    if not message:
        return
    chat_id = (message.get("chat") or {}).get("id")
    if not is_owner(chat_id):
        return
    text = str(message.get("text") or "").strip()
    kind = BUTTON_ALIASES.get(text.lower())
    if not kind:
        return
    markup = REPLY_KEYBOARD if kind == "start" else None
    send_message(handle_command(kind), markup)


def poll_telegram():
    telegram("deleteWebhook", {"drop_pending_updates": False}, timeout=15)
    me = telegram("getMe", timeout=15)
    username = ((me.get("result") or {}).get("username")) if me.get("ok") else None
    if username:
        print(f"Telegram bot @{username} → chat {CHAT_ID}", flush=True)
    else:
        print(f"Telegram getMe failed: {me.get('description')}", flush=True)

    with lock:
        store = read_store()
        offset = int(store.get("update_offset") or 0)
        welcome_sent = bool(store.get("welcome_sent"))

    if not welcome_sent:
        result = send_message(welcome_text(), REPLY_KEYBOARD)
        if result.get("ok"):
            with lock:
                store = read_store()
                store["welcome_sent"] = True
                write_store(store)
            print("Sent Telegram keyboard to your chat.", flush=True)
        else:
            hint = f" t.me/{username}" if username else ""
            print(
                f"Could not message chat {CHAT_ID}: {result.get('description')}. "
                f"Open the bot{hint} and tap Start.",
                flush=True,
            )

    while True:
        data = telegram("getUpdates", {"offset": offset, "timeout": 25, "allowed_updates": ["message", "callback_query"]}, timeout=35)
        if not data.get("ok"):
            time.sleep(3)
            continue
        for update in data.get("result") or []:
            offset = int(update.get("update_id", offset)) + 1
            try:
                process_update(update)
            except Exception as err:
                print(f"Telegram update error: {err}", flush=True)
            with lock:
                store = read_store()
                store["update_offset"] = offset
                write_store(store)


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def log_message(self, fmt, *args):
        if args and str(args[0]).startswith(("GET /api/", "POST /api/", "HEAD /api/")):
            super().log_message(fmt, *args)

    def _forbidden(self) -> bool:
        path = urlparse(self.path).path.lower()
        blocked = ("/.env", "/data/", "/.git", "/server.py")
        return path in {"/.env", "/server.py"} or any(path.startswith(b) for b in blocked)

    def do_GET(self):
        if urlparse(self.path).path == "/api/health":
            return self._json(200, {"ok": True})
        if self._forbidden():
            self.send_error(404)
            return
        super().do_GET()

    def do_HEAD(self):
        if self._forbidden():
            self.send_error(404)
            return
        super().do_HEAD()

    def do_POST(self):
        path = urlparse(self.path).path
        body = self._read_json()
        if body is None:
            return self._json(400, {"ok": False, "error": "json"})
        if path == "/api/hit":
            try:
                record_hit(body)
            except Exception as err:
                print(f"hit error: {err}", flush=True)
            return self._json(200, {"ok": True})
        if path == "/api/lead":
            result = record_lead(body)
            code = 200 if result.get("ok") else 400
            return self._json(code, result)
        self.send_error(404)

    def _read_json(self):
        try:
            length = int(self.headers.get("Content-Length") or 0)
        except ValueError:
            return None
        if length > 40_000:
            return None
        raw = self.rfile.read(length) if length else b"{}"
        if not raw:
            return {}
        try:
            data = json.loads(raw.decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError):
            return None
        return data if isinstance(data, dict) else None

    def _json(self, code: int, payload):
        blob = b"" if payload is None else json.dumps(payload).encode("utf-8")
        self.send_response(code)
        if blob:
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(blob)))
        else:
            self.send_header("Content-Length", "0")
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        if blob and self.command != "HEAD":
            self.wfile.write(blob)

    def end_headers(self):
        self.send_header("Cache-Control", "no-cache")
        super().end_headers()


def main():
    global TOKEN, CHAT_ID
    load_env()
    TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "").strip()
    CHAT_ID = os.environ.get("TELEGRAM_CHAT_ID", CHAT_ID).strip() or CHAT_ID
    host = os.environ.get("HOST", "0.0.0.0").strip() or "0.0.0.0"
    port = int(os.environ.get("PORT", "3000") or 3000)

    if not TOKEN:
        print("Missing TELEGRAM_BOT_TOKEN in .env", file=sys.stderr)
        sys.exit(1)

    threading.Thread(target=poll_telegram, name="telegram-poll", daemon=True).start()
    httpd = ThreadingHTTPServer((host, port), Handler)
    print(f"KINSEI http://{host}:{port}", flush=True)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nStopped.", flush=True)


if __name__ == "__main__":
    os.chdir(ROOT)
    main()
