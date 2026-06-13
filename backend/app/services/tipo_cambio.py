import json
from urllib.request import Request, urlopen
from urllib.error import URLError

API_URL = "https://dolaresabolivianos.com/api/llm.json"
TIMEOUT = 10


def fetch_tipo_cambio() -> float | None:
    try:
        req = Request(API_URL, headers={"User-Agent": "Mozilla/5.0"})
        with urlopen(req, timeout=TIMEOUT) as res:
            data = json.loads(res.read().decode("utf-8"))
        rate = data["currency_pair"]["exchange_rate"]["average"]
        return round(float(rate), 2)
    except (URLError, KeyError, ValueError, TypeError) as e:
        print(f"[tipo_cambio] Error fetching: {e}")
        return None
