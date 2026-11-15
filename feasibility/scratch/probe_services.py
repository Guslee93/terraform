"""Throwaway probe: does each public service answer, and does it hold data at the Oslo test site?

Run: .venv/bin/python -I probe_services.py  (writes evidence/probe-<date>.json)
Site: Compact Infill origin 59.9235 N, 10.758 E -> EUREF89 UTM33 (EPSG:25833).
"""
import datetime as dt
import json
import re
import ssl
import sys
import urllib.parse
import urllib.request

from pyproj import Transformer

LON, LAT, HALF = 10.758, 59.9235, 300.0
E, N = Transformer.from_crs(4326, 25833, always_xy=True).transform(LON, LAT)
BBOX = (E - HALF, N - HALF, E + HALF, N + HALF)
UA = {"User-Agent": "terraform-feasibility-probe/0.1"}
CTX = ssl.create_default_context()
try:
    import certifi  # noqa: F401
    CTX = ssl.create_default_context(cafile=certifi.where())
except ImportError:
    pass

WFS = {
    "nve-flomsoner": "https://wfs.geonorge.no/skwms1/wfs.flomsoner",
    "nve-kvikkleire": "https://wfs.geonorge.no/skwms1/wfs.kvikkleire",
    "nve-aktsomhet-kvikkleire": "https://wfs.geonorge.no/skwms1/wfs.aktsomhetskartforkvikkleireskred",
    "kv-stormflo": "https://wfs.geonorge.no/skwms1/wfs.stormflo_havniva",
    "svv-stoy-veg": "https://wfs.geonorge.no/skwms1/wfs.stoy_veg",
    "kv-matrikkel-teig": "https://wfs.geonorge.no/skwms1/wfs.matrikkelen-eiendomskart-teig",
}
WMS = {
    "nve-flomsoner-wms": "https://kart.nve.no/enterprise/services/Flomsoner2/MapServer/WMSServer",
    "nve-flomaktsomhet-wms": "https://kart.nve.no/enterprise/services/Flomaktsomhet/MapServer/WMSServer",
    "svv-norstoy-wms": "https://www.vegvesen.no/kart/ogc/norstoy_1_0/ows",
    "banenor-stoy-wms": "https://wms.geonorge.no/skwms1/wms.stoysonerjernbanenett",
    "kv-stormflo-wms": "https://wms.geonorge.no/skwms1/wms.stormflo_havniva",
    "geonorge-reguleringsplaner-wms": "https://wms.geonorge.no/skwms1/wms.reguleringsplaner",
    "dibk-nap-wms": "https://nap.ft.dibk.no/services/wms/reguleringsplaner/",
    "kv-matrikkelkart-wms": "https://wms.geonorge.no/skwms1/wms.matrikkelkart",
}
PLAIN = {
    "kv-hoydedata-punkt": f"https://ws.geonorge.no/hoydedata/v1/punkt?koordsys=4326&punkter=%5B%5B{LON}%2C{LAT}%5D%5D",
    "kv-eiendom-punkt": f"https://api.kartverket.no/eiendom/v1/punkt?nord={LAT}&ost={LON}&koordsys=4326&radius=10",
    "dibk-nap-ogcapi": "https://nap.ft.dibk.no/services/rest/reguleringsplaner/vn1/collections?f=json",
    "met-frost-noauth": "https://frost.met.no/sources/v0.jsonld?types=SensorSystem&geometry=nearest(POINT(10.758%2059.9235))",
    "met-locationforecast": f"https://api.met.no/weatherapi/locationforecast/2.0/compact?lat={LAT:.4f}&lon={LON:.4f}",
}


def get(url, limit=400_000, timeout=30):
    req = urllib.request.Request(url, headers=UA)
    try:
        with urllib.request.urlopen(req, timeout=timeout, context=CTX) as r:
            body = r.read(limit)
            return r.status, r.headers.get("Content-Type", ""), body
    except urllib.error.HTTPError as e:
        return e.code, e.headers.get("Content-Type", ""), e.read(4000)
    except Exception as e:  # network failure is a result, not a crash
        return None, type(e).__name__, str(e).encode()


def wfs(name, base):
    st, ct, body = get(f"{base}?service=WFS&request=GetCapabilities")
    text = body.decode("utf-8", "replace")
    types = re.findall(r"<Name[^>]*>([^<]+)</Name>", text)
    out = {"kind": "WFS", "url": base, "caps_status": st, "caps_type": ct, "feature_types": types[:20], "hits": {}}
    for t in [x for x in types if any(k in x for k in ("Flom","Kvikk","Faresone","Aktsomhet","Stormflo","Havniv","Stoy","Støy","Teig","Middel"))][:10]:
        q = urllib.parse.urlencode({
            "service": "WFS", "version": "2.0.0", "request": "GetFeature", "typeNames": t,
            "bbox": ",".join(f"{v:.1f}" for v in BBOX) + ",urn:ogc:def:crs:EPSG::25833", "count": 200,
        })
        s2, _, b2 = get(f"{base}?{q}", limit=3_000_000, timeout=60)
        txt = b2.decode("utf-8", "replace")
        n = len(re.findall(r"<wfs:member>", txt))
        m = re.search(r'numberReturned="(\d+)"', txt)
        out["hits"][t] = {"status": s2, "members": n, "numberReturned": m.group(1) if m else None,
                          "sample": txt[:600] if n else txt[:300]}
    return out


def wms(name, base):
    st, ct, body = get(f"{base}?service=WMS&request=GetCapabilities")
    text = body.decode("utf-8", "replace")
    layers = re.findall(r"<Layer[^>]*queryable=\"1\"[^>]*>\s*<Name>([^<]+)</Name>", text)
    all_layers = re.findall(r"<Name>([^<]+)</Name>", text)
    crs = sorted(set(re.findall(r"<CRS>(EPSG:\d+)</CRS>", text)))[:15]
    out = {"kind": "WMS", "url": base, "caps_status": st, "caps_type": ct, "layers": all_layers[:25],
           "queryable": layers[:25], "crs_sample": crs, "access": re.findall(r"<AccessConstraints>([^<]*)<", text)[:1],
           "fees": re.findall(r"<Fees>([^<]*)<", text)[:1], "featureinfo": {}}
    for lyr in layers[:6]:
        q = urllib.parse.urlencode({
            "service": "WMS", "version": "1.3.0", "request": "GetFeatureInfo", "layers": lyr, "query_layers": lyr,
            "crs": "EPSG:25833", "bbox": ",".join(f"{v:.1f}" for v in BBOX), "width": 101, "height": 101,
            "i": 50, "j": 50, "info_format": "text/plain", "styles": "", "format": "image/png",
        })
        s2, c2, b2 = get(f"{base}?{q}")
        out["featureinfo"][lyr] = {"status": s2, "type": c2, "body": b2.decode("utf-8", "replace")[:400]}
    return out


def main():
    result = {"run_utc": dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds"),
              "site": {"lat": LAT, "lon": LON, "utm33": [round(E, 1), round(N, 1)], "bbox_half_m": HALF}, "services": {}}
    for k, u in WFS.items():
        result["services"][k] = wfs(k, u); print(k, result["services"][k]["caps_status"], file=sys.stderr)
    for k, u in WMS.items():
        result["services"][k] = wms(k, u); print(k, result["services"][k]["caps_status"], file=sys.stderr)
    for k, u in PLAIN.items():
        s, c, b = get(u)
        result["services"][k] = {"kind": "HTTP", "url": u, "status": s, "type": c, "body": b.decode("utf-8", "replace")[:1200]}
        print(k, s, file=sys.stderr)
    path = f"evidence/probe-{result['run_utc'][:10]}.json"
    with open(path, "w") as f:
        json.dump(result, f, indent=1, ensure_ascii=False)
    print(path)


if __name__ == "__main__":
    main()
