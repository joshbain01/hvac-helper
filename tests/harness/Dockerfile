FROM python:3.12-slim
RUN useradd -u 1000 -m harness
WORKDIR /app/tests
ENV PYTHONPATH=/app
COPY harness/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . /app/tests/
USER harness

