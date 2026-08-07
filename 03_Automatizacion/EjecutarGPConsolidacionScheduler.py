"""Ejecuta y monitorea el GP de consolidacion con Python estandar.

No requiere ArcGIS Pro, arcpy, arcgis, requests ni modulos de logs externos.
"""

import json
import sys
import time
from datetime import datetime
from pathlib import Path
from urllib import error, parse, request


CONFIG = {
    "submit_job_url": (
        "https://esri.ciren.cl/server/rest/services/"
        "PROYECTOS_EXTERNOS_CNR/ConsolidadorSingularidades/GPServer/"
        "Consolidar%20encuestas%20validadas/submitJob"
    ),
    "poll_seconds": 5,
    "timeout_minutes": 30,
    "request_timeout_seconds": 60,
    "log_directory": str(Path(__file__).resolve().parent / "Logs"),
}

TERMINAL_STATUS = {
    "esriJobSucceeded",
    "esriJobFailed",
    "esriJobCancelled",
    "esriJobTimedOut",
}


class SimpleLog:
    def __init__(self, directory):
        log_directory = Path(directory).expanduser().resolve()
        log_directory.mkdir(parents=True, exist_ok=True)
        self.path = log_directory / "EjecutarGPConsolidacionScheduler.log"

    def write(self, level, message):
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        line = f"{timestamp} | {level:<5} | {message}"
        print(line)
        with self.path.open("a", encoding="utf-8") as log_file:
            log_file.write(line + "\n")


def post_form(url, values, timeout_seconds):
    body = parse.urlencode(values).encode("ascii")
    http_request = request.Request(
        url,
        data=body,
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        method="POST",
    )
    with request.urlopen(http_request, timeout=timeout_seconds) as response:
        return json.loads(response.read().decode("utf-8"))


def get_json(url, timeout_seconds):
    separator = "&" if "?" in url else "?"
    with request.urlopen(
        f"{url}{separator}f=json", timeout=timeout_seconds
    ) as response:
        return json.loads(response.read().decode("utf-8"))


def message_text(message):
    if isinstance(message, dict):
        return str(message.get("description") or message.get("message") or message)
    return str(message)


def main():
    logs = SimpleLog(CONFIG["log_directory"])
    started = time.monotonic()
    timeout_seconds = int(CONFIG["timeout_minutes"]) * 60
    request_timeout = int(CONFIG["request_timeout_seconds"])

    try:
        logs.write("INFO", "Inicio de consolidacion mediante GP Service")
        submission = post_form(
            CONFIG["submit_job_url"], {"f": "json"}, request_timeout
        )
        if "error" in submission:
            raise RuntimeError(f"Error REST al enviar trabajo: {submission['error']}")

        job_id = submission.get("jobId")
        if not job_id:
            raise RuntimeError(f"ArcGIS Server no devolvio jobId: {submission}")

        job_url = CONFIG["submit_job_url"].rsplit("/submitJob", 1)[0]
        job_url = f"{job_url}/jobs/{parse.quote(str(job_id), safe='')}"
        logs.write("INFO", f"Trabajo enviado: {job_id}")

        last_status = None
        result = {}
        while True:
            if time.monotonic() - started > timeout_seconds:
                logs.write(
                    "ERROR",
                    f"Tiempo maximo excedido; trabajo aun activo: {job_id}",
                )
                return 3

            result = get_json(job_url, request_timeout)
            if "error" in result:
                raise RuntimeError(f"Error REST consultando trabajo: {result['error']}")

            status = result.get("jobStatus", "estado_desconocido")
            if status != last_status:
                logs.write("INFO", f"Estado {job_id}: {status}")
                last_status = status
            if status in TERMINAL_STATUS:
                break
            time.sleep(int(CONFIG["poll_seconds"]))

        for message in result.get("messages", []) or []:
            logs.write("INFO", message_text(message))

        if result.get("jobStatus") == "esriJobSucceeded":
            duration = int(time.monotonic() - started)
            logs.write("INFO", f"Consolidacion finalizada en {duration} segundos")
            return 0

        logs.write(
            "ERROR",
            f"El trabajo termino con estado {result.get('jobStatus')}: {job_id}",
        )
        return 2
    except (error.HTTPError, error.URLError, TimeoutError) as exc:
        logs.write("ERROR", f"Error HTTP o de red: {exc}")
        return 1
    except Exception as exc:
        logs.write("ERROR", f"Error ejecutando GP Service: {exc}")
        return 1


if __name__ == "__main__":
    sys.exit(main())
