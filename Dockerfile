FROM python:3.12-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 DATA_DIR=/data
WORKDIR /app
COPY requirements.txt .
COPY LICENSE NOTICE ./
RUN pip install --no-cache-dir -r requirements.txt && useradd --uid 10001 --create-home iptv && mkdir /data && chown iptv:iptv /data
COPY --chown=iptv:iptv app/ /app/
USER iptv
EXPOSE 8324
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8324/healthz',timeout=3)"
CMD ["gunicorn", "--bind", "0.0.0.0:8324", "--workers", "1", "--threads", "4", "--timeout", "60", "--access-logfile", "-", "server:app"]
