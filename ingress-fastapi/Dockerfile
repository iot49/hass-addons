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

CMD ["./bin/python3", "-m", "gunicorn", "main:app", "--bind", "172.30.32.2:8099", \
        "--workers", "2", "--worker-class", "uvicorn.workers.UvicornWorker", \
        "--preload", "--log-level", "warning"]

# uvicorn.run(app, host="172.30.32.2", port=8099)