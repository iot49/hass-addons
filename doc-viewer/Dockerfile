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

EXPOSE 8000

CMD ["./bin/python3", "-m", "gunicorn", "main:app", "--bind", "0.0.0.0:8000", \
        "--workers", "2", "--worker-class", "uvicorn.workers.UvicornWorker", \
        "--preload", "--log-level", "warning"]