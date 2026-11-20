# Игра + Telegram-бот в одном контейнере.
# Сборка:  docker build -t soulclicker .
# Запуск:  docker run -d -p 8080:8080 \
#            -e BOT_TOKEN=... -e WEBAPP_URL=https://game.example.com \
#            -v soulclicker-data:/app/bot/data soulclicker
FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 \
    HOST=0.0.0.0 \
    PORT=8080 \
    DB_PATH=/app/bot/data/saves.db

WORKDIR /app
COPY . /app
RUN mkdir -p /app/bot/data

EXPOSE 8080
VOLUME ["/app/bot/data"]

CMD ["python", "bot/bot.py"]
