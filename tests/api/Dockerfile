FROM python:3.12-slim
RUN useradd -u 1000 -m api
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
USER api
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]
