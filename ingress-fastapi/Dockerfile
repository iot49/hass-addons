ARG BUILD_FROM
FROM $BUILD_FROM

RUN apk add --no-cache \
    python3 \
    py3-pip 

WORKDIR /app

COPY requirements.txt .

RUN python3 -m venv . && \
    . ./bin/activate && \
    pip install --no-cache-dir -r requirements.txt

COPY main.py .
COPY html/ /html/

EXPOSE 8099

# [2025-10-02 21:17:07 +0000] [79] [ERROR] connection to ('172.30.32.2', 8099) failed: [Errno 99] Address not available
# [2025-10-02 21:17:08 +0000] [79] [ERROR] Can't connect to ('172.30.32.2', 8099)

CMD ["./bin/python3", "-m", "gunicorn", "main:app", "--bind", "0.0.0.0:8099", \
        "--workers", "2", "--worker-class", "uvicorn.workers.UvicornWorker", \
        "--preload", "--log-level", "warning", \
        "--timeout", "300", \
        "--limit-request-line", "8192", \
        "--limit-request-field_size", "16384", \
        "--limit-request-fields", "1000"]

# uvicorn.run(app, host="172.30.32.2", port=8099)