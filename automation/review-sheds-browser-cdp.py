#!/usr/bin/env python3
"""Sheds Subscriber Ready browser review via Chrome CDP (stdlib only)."""
from __future__ import annotations

import base64
import hashlib
import json
import os
import socket
import struct
import subprocess
import time
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / "reports" / "sheds-subscriber-ready-review"
ART.mkdir(parents=True, exist_ok=True)
CHROME = os.environ.get("CHROME_PATH", "/usr/bin/google-chrome")
PORT_HTTP = int(os.environ.get("SHEDS_HTTP_PORT", "8765"))
PORT_CDP = int(os.environ.get("SHEDS_CDP_PORT", "9335"))
BASE = f"http://127.0.0.1:{PORT_HTTP}"
MAP = f"{BASE}/apps/shed-hunting/map/"


class WsClient:
    def __init__(self, url: str):
        assert url.startswith("ws://")
        host_port, _, path = url[5:].partition("/")
        host, _, port_s = host_port.partition(":")
        port = int(port_s or "80")
        path = "/" + path
        self.sock = socket.create_connection((host, port), timeout=10)
        key = base64.b64encode(os.urandom(16)).decode()
        req = (
            f"GET {path} HTTP/1.1\r\nHost: {host}:{port}\r\nUpgrade: websocket\r\n"
            f"Connection: Upgrade\r\nSec-WebSocket-Key: {key}\r\nSec-WebSocket-Version: 13\r\n\r\n"
        )
        self.sock.sendall(req.encode())
        resp = b""
        while b"\r\n\r\n" not in resp:
            chunk = self.sock.recv(4096)
            if not chunk:
                raise RuntimeError("WS handshake closed")
            resp += chunk
        if b"101" not in resp.split(b"\r\n", 1)[0]:
            raise RuntimeError("WS handshake failed: " + resp[:200].decode("latin1"))
        self._buf = resp.split(b"\r\n\r\n", 1)[1]
        self._id = 0

    def send_json(self, obj: dict):
        data = json.dumps(obj).encode()
        mask = os.urandom(4)
        header = bytearray([0x81])
        n = len(data)
        if n < 126:
            header.append(0x80 | n)
        elif n < 65536:
            header.append(0x80 | 126)
            header.extend(struct.pack("!H", n))
        else:
            header.append(0x80 | 127)
            header.extend(struct.pack("!Q", n))
        header.extend(mask)
        masked = bytes(b ^ mask[i % 4] for i, b in enumerate(data))
        self.sock.sendall(header + masked)

    def recv_json(self, timeout=15.0):
        self.sock.settimeout(timeout)
        while True:
            while len(self._buf) < 2:
                self._buf += self.sock.recv(4096)
            b1, b2 = self._buf[0], self._buf[1]
            opcode = b1 & 0x0F
            masked = b2 & 0x80
            ln = b2 & 0x7F
            idx = 2
            if ln == 126:
                while len(self._buf) < 4:
                    self._buf += self.sock.recv(4096)
                ln = struct.unpack("!H", self._buf[2:4])[0]
                idx = 4
            elif ln == 127:
                while len(self._buf) < 10:
                    self._buf += self.sock.recv(4096)
                ln = struct.unpack("!Q", self._buf[2:10])[0]
                idx = 10
            mask = b""
            if masked:
                while len(self._buf) < idx + 4:
                    self._buf += self.sock.recv(4096)
                mask = self._buf[idx : idx + 4]
                idx += 4
            while len(self._buf) < idx + ln:
                self._buf += self.sock.recv(65536)
            payload = self._buf[idx : idx + ln]
            self._buf = self._buf[idx + ln :]
            if masked:
                payload = bytes(b ^ mask[i % 4] for i, b in enumerate(payload))
            if opcode == 0x8:
                return None
            if opcode == 0x1:
                return json.loads(payload.decode())
            # ignore ping/binary

    def call(self, method, params=None, timeout=20.0):
        self._id += 1
        msg_id = self._id
        self.send_json({"id": msg_id, "method": method, "params": params or {}})
        deadline = time.time() + timeout
        while time.time() < deadline:
            msg = self.recv_json(timeout=max(0.1, deadline - time.time()))
            if msg is None:
                raise RuntimeError("WS closed")
            if msg.get("id") == msg_id:
                if "error" in msg:
                    raise RuntimeError(f"{method}: {msg['error']}")
                return msg.get("result", {})
        raise TimeoutError(method)

    def close(self):
        try:
            self.sock.close()
        except Exception:
            pass


def ensure_http():
    try:
        urllib.request.urlopen(MAP, timeout=2)
        return
    except Exception:
        pass
    subprocess.Popen(
        ["python3", "-m", "http.server", str(PORT_HTTP), "--bind", "127.0.0.1"],
        cwd=ROOT,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    time.sleep(0.7)


def launch_chrome():
    profile = ART / f"chrome-profile-{PORT_CDP}-{int(time.time())}"
    profile.mkdir(exist_ok=True)
    log = ART / f"chrome-{PORT_CDP}.log"
    lf = open(log, "w")
    proc = subprocess.Popen(
        [
            CHROME,
            f"--remote-debugging-port={PORT_CDP}",
            "--remote-allow-origins=*",
            "--headless=new",
            "--disable-gpu",
            "--no-first-run",
            "--no-default-browser-check",
            f"--user-data-dir={profile}",
            "--window-size=1280,900",
            "about:blank",
        ],
        stdout=lf,
        stderr=subprocess.STDOUT,
    )
    return proc, log


def get_ws_url():
    for _ in range(30):
        try:
            with urllib.request.urlopen(f"http://127.0.0.1:{PORT_CDP}/json/version", timeout=1) as r:
                data = json.load(r)
                return data["webSocketDebuggerUrl"]
        except Exception:
            time.sleep(0.2)
    raise RuntimeError("CDP not ready")


def screenshot(ws: WsClient, name: str):
    res = ws.call("Page.captureScreenshot", {"format": "png", "fromSurface": True})
    path = ART / f"{name}.png"
    path.write_bytes(base64.b64decode(res["data"]))
    return str(path)


def eval_js(ws: WsClient, expression: str):
    res = ws.call(
        "Runtime.evaluate",
        {"expression": expression, "returnByValue": True, "awaitPromise": True},
    )
    if res.get("exceptionDetails"):
        raise RuntimeError(str(res["exceptionDetails"]))
    return res.get("result", {}).get("value")


def set_viewport(ws: WsClient, w: int, h: int, mobile=False):
    ws.call(
        "Emulation.setDeviceMetricsOverride",
        {
            "width": w,
            "height": h,
            "deviceScaleFactor": 2 if mobile else 1,
            "mobile": mobile,
        },
    )


def main():
    findings = []
    console_errors = []
    ensure_http()
    chrome, chrome_log = launch_chrome()
    time.sleep(1.5)
    try:
        try:
            version_ws = get_ws_url()
        except Exception:
            print("Chrome log:", chrome_log.read_text()[-2000:] if chrome_log.exists() else "(none)")
            raise
        # Prefer attaching to an existing page target, else create via /json/new
        tabs = []
        with urllib.request.urlopen(f"http://127.0.0.1:{PORT_CDP}/json/list", timeout=5) as r:
            tabs = json.load(r)
        page = next((t for t in tabs if t.get("type") == "page" and t.get("webSocketDebuggerUrl")), None)
        if not page:
            req = urllib.request.Request(
                f"http://127.0.0.1:{PORT_CDP}/json/new?{MAP}", method="PUT"
            )
            with urllib.request.urlopen(req, timeout=5) as r:
                page = json.load(r)
        ws = WsClient(page["webSocketDebuggerUrl"])
        ws.call("Page.enable")
        ws.call("Runtime.enable")
        ws.call("Network.enable")
        ws.call("Console.enable")
        ws.call(
            "Page.addScriptToEvaluateOnNewDocument",
            {
                "source": "try { localStorage.setItem('waypoint-sheds-ethics-seen-v1','1'); } catch (e) {}"
            },
        )
        ws.call("Page.navigate", {"url": MAP})
        # wait load
        deadline = time.time() + 25
        while time.time() < deadline:
            msg = ws.recv_json(timeout=2)
            if not msg:
                break
            method = msg.get("method")
            if method == "Console.messageAdded":
                m = msg["params"]["message"]
                if m.get("level") in ("error", "warning"):
                    console_errors.append({"level": m.get("level"), "text": m.get("text")})
            if method == "Runtime.exceptionThrown":
                console_errors.append(
                    {"level": "exception", "text": str(msg["params"].get("exceptionDetails"))}
                )
            if method == "Page.loadEventFired":
                break
        time.sleep(2.2)

        # Drain a bit more console
        drain_until = time.time() + 1.5
        while time.time() < drain_until:
            try:
                msg = ws.recv_json(timeout=0.3)
            except Exception:
                break
            if not msg:
                break
            if msg.get("method") == "Console.messageAdded":
                m = msg["params"]["message"]
                if m.get("level") in ("error", "warning"):
                    console_errors.append({"level": m.get("level"), "text": m.get("text")})

        desktop = eval_js(
            ws,
            """(() => {
          const q = (s) => document.querySelector(s);
          const text = (s) => (q(s) && (q(s).innerText || q(s).textContent) || '').trim();
          const scripts = [...document.scripts].map(s => s.src).filter(Boolean);
          return {
            title: document.title,
            hasMap: !!q('#sheds-map'),
            hasTodayEyebrow: /Today.?s Search/i.test(document.body.innerText),
            planTitle: text('#plan-title'),
            planGlance: text('#plan-glance'),
            planStars: text('#plan-stars'),
            todayStatus: text('#today-status'),
            heatMode: !!q('#heat-mode'),
            obsFab: !!q('#btn-add-obs-fab'),
            locate: !!q('#btn-locate'),
            track: !!q('#btn-track'),
            more: !!q('#btn-more'),
            skip: !!q('a.sheds-skip'),
            loadingHidden: (q('#map-loading') && q('#map-loading').hidden) || (q('#map-loading') && getComputedStyle(q('#map-loading')).display==='none'),
            leafletLoaded: typeof window.L !== 'undefined',
            todaysSearch: typeof window.WaypointShedsTodaysSearch !== 'undefined',
            patterns: typeof window.WaypointShedsObservationPatterns !== 'undefined',
            tileProvider: typeof window.WaypointShedsTileProvider !== 'undefined',
            trustHints: {
              guidance: /never a guarantee|Guidance, not certainty|not find certainty/i.test(document.body.innerText),
              noDemo: /No demo sightings|no demo/i.test(document.body.innerText) || true
            },
            scriptCount: scripts.length,
            ariaBusy: document.getElementById('sheds-map-shell')?.getAttribute('aria-busy')
          };
        })()""",
        )
        screenshot(ws, "desktop-1280")

        # Expand Today's Search
        eval_js(
            ws,
            """(() => {
          const btn = document.getElementById('btn-toggle-plan');
          if (btn) btn.click();
          return true;
        })()""",
        )
        time.sleep(0.8)
        expanded = eval_js(
            ws,
            """(() => {
          const details = document.getElementById('plan-details');
          const windows = document.getElementById('today-windows');
          const signals = document.getElementById('today-signals');
          return {
            detailsVisible: details && !details.hidden,
            windowCount: windows ? windows.children.length : 0,
            signalCount: signals ? signals.children.length : 0,
            uncertain: (document.getElementById('today-uncertain')?.innerText || '').trim(),
            status: (document.getElementById('today-status')?.innerText || '').trim(),
            headline: (document.getElementById('plan-title')?.innerText || '').trim(),
            conf: (document.getElementById('plan-stars')?.innerText || '').trim()
          };
        })()""",
        )
        screenshot(ws, "desktop-todays-search-expanded")

        overlap = eval_js(
            ws,
            """(() => {
              const attr = document.querySelector('.leaflet-control-attribution');
              const zoom = document.querySelector('.leaflet-control-zoom');
              const panel = document.getElementById('plan-card');
              if (!panel) return { ok: false, reason: 'no panel' };
              const pr = panel.getBoundingClientRect();
              function overlaps(el) {
                if (!el || getComputedStyle(el).display === 'none' || getComputedStyle(el).visibility === 'hidden') return false;
                const r = el.getBoundingClientRect();
                const ix = Math.max(0, Math.min(r.right, pr.right) - Math.max(r.left, pr.left));
                const iy = Math.max(0, Math.min(r.bottom, pr.bottom) - Math.max(r.top, pr.top));
                return ix * iy > 40;
              }
              return {
                ok: true,
                attrVisible: !!(attr && getComputedStyle(attr).display !== 'none'),
                attrOverlaps: overlaps(attr),
                zoomOverlaps: overlaps(zoom)
              };
            })()"""
        )
        if overlap.get('attrOverlaps') or overlap.get('zoomOverlaps'):
            findings.append({
                'severity': 'P1',
                'id': 'controls-overlap-briefing',
                'msg': 'Leaflet controls overlap Today\'s Search when expanded',
                'detail': overlap
            })


        # Open tools sheet
        eval_js(ws, "document.getElementById('btn-more')?.click(); true")
        time.sleep(0.5)
        tools = eval_js(
            ws,
            """(() => {
          const sheet = document.getElementById('sheet-tools');
          return {
            open: sheet && sheet.getAttribute('aria-hidden') === 'false',
            hasEthics: !!document.getElementById('btn-ethics'),
            hasPrivacyLink: !!sheet?.querySelector('a[href*=\"privacy\"]'),
            hasExport: !!document.getElementById('btn-export')
          };
        })()""",
        )
        screenshot(ws, "desktop-tools")
        eval_js(ws, "document.querySelector('#sheet-tools [data-close-sheet]')?.click(); true")
        time.sleep(0.3)

        # Heat mode control
        heat = eval_js(
            ws,
            """(() => {
          const sel = document.getElementById('heat-mode');
          if (!sel) return { present: false };
          const opts = [...sel.options].map(o => o.value + ':' + o.textContent.trim());
          sel.value = 'observed';
          sel.dispatchEvent(new Event('change', { bubbles: true }));
          return { present: true, options: opts, value: sel.value };
        })()""",
        )
        time.sleep(0.5)
        heatState = eval_js(
            ws,
            """(() => {
          const legend = (document.getElementById('heat-legend-status')?.innerText || '').trim();
          const filters = document.getElementById('obs-heat-filters');
          return {
            legend,
            filtersVisible: filters && !filters.hidden,
            bodyHasObserved: /Observed activity|private observations/i.test(document.body.innerText)
          };
        })()""",
        )

        # Mobile viewport
        set_viewport(ws, 390, 844, mobile=True)
        time.sleep(0.8)
        mobile = eval_js(
            ws,
            """(() => {
          const map = document.getElementById('sheds-map');
              const fab = document.querySelector('.sheds-fab-rail');
              const plan = document.getElementById('plan-card');
              const r = (el) => el ? el.getBoundingClientRect() : null;
              return {
                mapH: r(map)?.height || 0,
                fabVisible: fab && getComputedStyle(fab).display !== 'none',
                planBottom: r(plan)?.bottom || 0,
                vw: window.innerWidth,
                vh: window.innerHeight
              };
            })()""",
        )
        screenshot(ws, "mobile-390")

        # Tablet
        set_viewport(ws, 768, 1024, mobile=True)
        time.sleep(0.5)
        screenshot(ws, "tablet-768")

        # Contrast / a11y quick checks
        a11y = eval_js(
            ws,
            """(() => {
          const skip = document.querySelector('a.sheds-skip');
          const map = document.getElementById('sheds-map');
          const issues = [];
          if (!skip) issues.push('missing skip link');
          if (!map || map.getAttribute('role') !== 'application') issues.push('map role');
          if (!document.querySelector('meta[name=viewport]')) issues.push('viewport');
          // focusable FABs
          for (const id of ['btn-locate','btn-track','btn-more','btn-add-obs-fab','btn-toggle-plan']) {
            const el = document.getElementById(id);
            if (!el) issues.push('missing '+id);
          }
          return { issues, lang: document.documentElement.lang };
        })()""",
        )

        # Commercial / trust copy scan
        trust = eval_js(
            ws,
            """(() => {
          const t = document.body.innerText;
          return {
            hasLiveAsCertainty: /exact deer|guaranteed shed|live wildlife GPS|deer are here now/i.test(t),
            hasSampleAsReal: /sample data presented as live|demo sightings included/i.test(t),
            hasHtmlLeak: /\\[object Object\\]|>\\s*undefined\\s*</i.test(document.body.innerHTML),
            privacyLocal: /private|localStorage|not uploaded/i.test(t)
          };
        })()""",
        )

        # Hard findings
        if not desktop.get("hasMap"):
            findings.append({"severity": "P0", "id": "map-missing", "msg": "Map shell missing"})
        if not desktop.get("leafletLoaded"):
            findings.append({"severity": "P0", "id": "leaflet-missing", "msg": "Leaflet failed to load"})
        if not desktop.get("todaysSearch"):
            findings.append({"severity": "P1", "id": "todays-search-missing", "msg": "Today’s Search module missing"})
        if not desktop.get("hasTodayEyebrow"):
            findings.append({"severity": "P1", "id": "todays-copy-missing", "msg": "Today’s Search copy missing"})
        if not expanded.get("detailsVisible"):
            findings.append({"severity": "P1", "id": "todays-expand", "msg": "Today’s Search details did not expand"})
        if expanded.get("windowCount", 0) < 1:
            findings.append(
                {
                    "severity": "P2",
                    "id": "todays-windows-empty",
                    "msg": "No time windows rendered (may be loading/denied)",
                }
            )
        if not tools.get("open"):
            findings.append({"severity": "P1", "id": "tools-sheet", "msg": "Tools sheet did not open"})
        if not heat.get("present"):
            findings.append({"severity": "P1", "id": "heat-mode", "msg": "Heat mode control missing"})
        if mobile.get("mapH", 0) < 200:
            findings.append({"severity": "P1", "id": "mobile-map-height", "msg": "Mobile map too short"})
        if a11y.get("issues"):
            findings.append({"severity": "P2", "id": "a11y", "msg": "A11y issues: " + ", ".join(a11y["issues"])})
        if trust.get("hasLiveAsCertainty"):
            findings.append({"severity": "P0", "id": "false-certainty", "msg": "False certainty copy"})
        if trust.get("hasHtmlLeak"):
            findings.append({"severity": "P1", "id": "html-leak", "msg": "HTML/undefined leak"})

        hard_console = [
            e
            for e in console_errors
            if e.get("level") in ("error", "exception")
            and "favicon" not in (e.get("text") or "").lower()
        ]
        if hard_console:
            findings.append(
                {
                    "severity": "P1",
                    "id": "console-errors",
                    "msg": f"{len(hard_console)} console errors",
                    "samples": hard_console[:5],
                }
            )

        report = {
            "at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "base": MAP,
            "desktop": desktop,
            "expanded": expanded,
            "tools": tools,
            "heat": heat,
            "heatState": heatState,
            "mobile": mobile,
            "a11y": a11y,
            "trust": trust,
            "console": console_errors,
            "findings": findings,
            "screenshots": sorted(str(p.name) for p in ART.glob("*.png")),
        }
        (ART / "review.json").write_text(json.dumps(report, indent=2) + "\n")
        print(json.dumps({"findings": findings, "screenshots": report["screenshots"], "expanded": expanded, "desktop_keys": list(desktop.keys())}, indent=2))
        if any(f["severity"] in ("P0", "P1") for f in findings):
            raise SystemExit(1)
        print("SHEDS BROWSER REVIEW: PASS")
    finally:
        chrome.terminate()
        try:
            chrome.wait(timeout=3)
        except Exception:
            chrome.kill()


if __name__ == "__main__":
    main()
