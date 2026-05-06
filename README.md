# Jury Voting MVP

Full-stack MVP для системы оценивания жюри: FastAPI (JWT + WebSocket) + MySQL + React/Vite + RadarChart.

## Локальный запуск (dev)

1. Убедитесь, что установлен `docker` и `docker compose`.
2. Запустите:

```bash
docker-compose up --build
```

3. Откройте:
   - Frontend: [http://localhost:3000](http://localhost:3000)

## Деплой на Ubuntu VPS (prod)

### 1) Подготовка сервера

```bash
sudo apt update
sudo apt install -y docker.io docker-compose-plugin git
sudo systemctl enable --now docker
```

### 2) Клонирование проекта и env

```bash
git clone <your-repo-url> jury-voting
cd jury-voting
cp .env.production.example .env.production
```

Отредактируйте `.env.production`:
- `SECRET_KEY` — длинный случайный ключ
- `MYSQL_PASSWORD`, `MYSQL_ROOT_PASSWORD` — свои пароли
- `CORS_ORIGINS` — ваш домен или IP (`http://your-domain` или `http://<VPS_IP>`)

### 3) Запуск production-стека

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build
```

Приложение будет доступно на:
- `http://<VPS_IP>` (порт 80)

### 4) Обновление после изменений

```bash
git pull
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build
```

## Тестовые учетные данные

- `judge1` / `1111`
- `judge2` / `1111`
- `judge3` / `1111`

## Что входит в MVP

- Авторизация по JWT (`/api/auth/login`, `/api/auth/me`)
- Выбор инициативы (`/api/projects`)
- Голосование (`/api/votes/{project_id}`)
- Импорт инициатив из XLSX (`/api/pipeline/projects/import`)
- Выгрузка в XLSX (`/api/pipeline/votes/export.xlsx`)
- Данные для диаграммы (`/api/votes/{project_id}`)
- Статус проголосовавших (`/api/votes/{project_id}/status`)
- WebSocket: события `vote_submitted` и `voting_complete`

