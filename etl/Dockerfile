FROM eclipse-temurin:17-jre-jammy

RUN apt-get update && apt-get install -y \
    python3.11 python3.11-dev python3-pip \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/* \
    && ln -sf /usr/bin/python3.11 /usr/bin/python3 \
    && ln -sf /usr/bin/python3.11 /usr/bin/python

WORKDIR /app

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

COPY transform_med_ma.py .

CMD ["spark-submit", \
     "--master", "local[*]", \
     "--driver-memory", "2g", \
     "transform_med_ma.py"]