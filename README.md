# Jury Voting MVP

## КЛЮЧЕВАЯ ВЕТКА В git: main

Система для оценки инициатив жюри из нескольких экспертов. Каждый эксперт заходит под своим логином, выбирает инициативу и выставляет баллы по критериям. Результаты видны в реальном времени на лепестковой диаграмме.

## Возможности

- Авторизация по JWT: каждый эксперт входит со своим логином и паролем
- Голосование по нескольким критериям с максимальным баллом 5
- Лепестковая (radar) диаграмма с агрегированными оценками по каждому критерию
- Статус голосования: видно, кто из экспертов уже проголосовал
- WebSocket-уведомления: при отправке голоса (`vote_submitted`) и завершении голосования (`voting_complete`) все подключенные клиенты получают обновление без перезагрузки страницы
- Импорт инициатив из XLSX-файла (`POST /api/pipeline/projects/import`)
- Выгрузка итогов голосования в XLSX (`GET /api/pipeline/votes/export.xlsx`)
- Управление активной инициативой: в один момент активна одна инициатива

## Технический стек

| Слой | Технология |
|---|---|
| Backend | FastAPI (Python), async SQLAlchemy + aiomysql |
| База данных | MySQL 8 (utf8mb4) |
| Frontend | React + Vite, Recharts (RadarChart) |
| Аутентификация | JWT (python-jose) + bcrypt |
| Транспорт реального времени | WebSocket (встроенный в FastAPI/Starlette) |
| Сборка и запуск | Docker, Docker Compose |
| Prod-раздача фронтенда | nginx (порт 80), он же проксирует `/api` на backend |

### Схема базы данных

- `users` - эксперты (логин, bcrypt-хеш пароля, отображаемое имя, цвет на диаграмме)
- `projects` - инициативы (заголовок, описание, флаг `is_active`)
- `criteria` - критерии оценки (название, максимальный балл)
- `votes` - оценки (связь эксперт + инициатива + критерий + балл)

### API-маршруты

| Метод | Путь | Назначение |
|---|---|---|
| POST | `/api/auth/login` | Получить JWT-токен |
| GET | `/api/auth/me` | Данные текущего пользователя |
| GET | `/api/projects` | Список инициатив |
| GET | `/api/votes/{project_id}` | Оценки и данные для диаграммы |
| POST | `/api/votes/{project_id}` | Отправить голос |
| GET | `/api/votes/{project_id}/status` | Кто проголосовал |
| POST | `/api/pipeline/projects/import` | Загрузить инициативы из XLSX |
| GET | `/api/pipeline/votes/export.xlsx` | Скачать итоги в XLSX |
| WS | `/ws` | WebSocket-соединение |

## Формат XLSX для импорта инициатив

Эндпоинт `POST /api/pipeline/projects/import` принимает `.xlsx`-файл. Первая строка — заголовки столбцов (регистр не важен), далее — строки с данными.

### Обязательные и опциональные столбцы

| Столбец | Обязательный | Описание |
|---|:---:|---|
| `название инициативы` | ✅ | Название инициативы; строки без этого поля пропускаются |
| `описание` | ✅ | Краткое описание инициативы |
| `автор` | ✅ | Автор или команда |
| `категория` | ✅ | Категория / направление |
| `ожидаемый эффект` | ✅ | Ожидаемый эффект от реализации |
| `срок реализации` | ✅ | Предполагаемый срок (произвольный текст) |
| `статус` | ✅ | Текущий статус инициативы |
| `активный` | ➖ | Пометить как активную инициативу: `1`/`true`/`да` — активная, `0`/`false`/`нет` — нет. Если несколько строк помечены активными, победит последняя |

> **Порядок столбцов произвольный** — поиск ведётся по заголовку, а не по позиции.

### Пример файла

| название инициативы | описание | автор | категория | ожидаемый эффект | срок реализации | статус | активный |
|---|---|---|---|---|---|---|:---:|
| Оптимизация процесса онбординга | Сократить время адаптации новых сотрудников за счёт цифровых чек-листов | Иванов И.И. | HR | -30% времени онбординга | Q3 2025 | На рассмотрении | да |
| Автоматизация сверки отчётов | Внедрить скрипт автоматической сверки ежемесячных отчётов | Петрова А.С. | Финансы | Экономия 20 ч/мес | Q4 2025 | Проработка | нет |
| Внутренний портал знаний | Создать базу знаний для хранения регламентов и обучающих материалов | Команда ИТ | ИТ | Единая точка доступа к документам | Q1 2026 | Идея | |

После импорта содержимое всех непустых колонок (кроме `активный`) объединяется в поле `description` проекта с подписями.

## Локальный запуск (dev)

Требования: `docker` и `docker compose`.

```bash
docker compose up --build
```

Фронтенд будет доступен на [http://localhost:3000](http://localhost:3000).

## Тестовые учетные данные

| Логин | Пароль | Отображаемое имя |
|---|---|---|
| judge1 | 1111 | Эксперт 1 |
| judge2 | 1111 | Эксперт 2 |
| judge3 | 1111 | Эксперт 3 |
| judge4 | 1111 | Эксперт 4 |
| judge5 | 1111 | Эксперт 5 |
| judge6 | 1111 | Эксперт 6 |
| judge7 | 1111 | Эксперт 7 |
| judge8 | 1111 | Эксперт 8 |
| judge9 | 1111 | Эксперт 9 |
| judge10 | 1111 | Эксперт 10 |

---

## Инструкция к хостингу

### Требования к серверу

- Ubuntu 22.04 LTS (или 20.04)
- Минимум 1 vCPU, 1 GB RAM, 10 GB диска
- Открытый порт 80 (и 443, если планируете HTTPS)
- Доступ по SSH с правами sudo

### 1. Установка Docker

```bash
sudo apt update
sudo apt install -y docker.io docker-compose-plugin git
sudo systemctl enable --now docker
```

Проверка:

```bash
docker --version
docker compose version
```

Если хотите запускать docker без sudo, добавьте своего пользователя в группу:

```bash
sudo usermod -aG docker $USER
newgrp docker
```

### 2. Получение кода

```bash
git clone <your-repo-url> jury-voting
cd jury-voting
```

### 3. Настройка переменных окружения

Скопируйте пример и откройте его в редакторе:

```bash
cp .env.production.example .env.production
nano .env.production
```

Содержимое файла с пояснениями:

```env
# База данных
MYSQL_DATABASE=appdb
MYSQL_USER=app
MYSQL_PASSWORD=<придумайте надежный пароль для пользователя app>
MYSQL_ROOT_PASSWORD=<придумайте надежный пароль для root>

# Секрет для подписи JWT-токенов
# Сгенерировать: python3 -c "import secrets; print(secrets.token_hex(32))"
SECRET_KEY=<длинная случайная строка>

# Разрешенные источники для CORS
# Укажите адрес, с которого пользователи открывают приложение
# Например: http://192.168.1.10 или http://yourdomain.com
CORS_ORIGINS=http://<IP-адрес или домен сервера>
```

> Никогда не коммитьте `.env.production` в репозиторий. Файл уже добавлен в `.gitignore`.

### 4. Запуск prod-стека

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build
```

Флаги:
- `-d` - запуск в фоне
- `--build` - пересборка образов перед стартом

После запуска Docker поднимет три контейнера:
- `mysql` - база данных (данные хранятся в именованном volume `mysql_data`)
- `backend` - FastAPI-приложение
- `frontend` - nginx, раздает React-сборку и проксирует `/api` на backend

Проверка, что контейнеры запущены:

```bash
docker compose -f docker-compose.prod.yml ps
```

Приложение доступно по адресу `http://<IP-сервера>`.

### 5. Просмотр логов

Все контейнеры сразу:

```bash
docker compose -f docker-compose.prod.yml logs -f
```

Конкретный сервис:

```bash
docker compose -f docker-compose.prod.yml logs -f backend
docker compose -f docker-compose.prod.yml logs -f frontend
docker compose -f docker-compose.prod.yml logs -f mysql
```

### 6. Обновление после изменений в коде

```bash
git pull
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build
```

Docker пересоберет только измененные образы и перезапустит соответствующие контейнеры. Данные в базе сохранятся - они лежат в volume `mysql_data`.

### 7. Остановка стека

```bash
docker compose -f docker-compose.prod.yml down
```

Остановка с удалением volume (внимание: данные базы будут удалены):

```bash
docker compose -f docker-compose.prod.yml down -v
```

### 8. Резервное копирование базы данных

Создать дамп:

```bash
docker compose -f docker-compose.prod.yml exec mysql \
  mysqldump -uroot -p"${MYSQL_ROOT_PASSWORD}" appdb > backup_$(date +%Y%m%d).sql
```

Восстановить из дампа:

```bash
docker compose -f docker-compose.prod.yml exec -T mysql \
  mysql -uroot -p"${MYSQL_ROOT_PASSWORD}" appdb < backup_20240101.sql
```

### 9. Настройка HTTPS (опционально)

Если у вас есть домен, рекомендуется настроить HTTPS через Certbot + nginx на хосте (не внутри контейнера). Схема:

1. Установить nginx на хосте: `sudo apt install nginx`
2. Получить сертификат: `sudo certbot --nginx -d yourdomain.com`
3. В конфиге nginx проксировать трафик на `localhost:80` (контейнер frontend)
4. В `.env.production` поменять `CORS_ORIGINS=https://yourdomain.com`
5. Пересобрать стек: `docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build`

### 10. Частые проблемы

**На экране входа отображается `Not Found`**

Фронтенд собран со старым значением `VITE_API_BASE_URL`. Пересоберите с флагом `--force-recreate`:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build --force-recreate
```

**Backend не стартует, в логах ошибка подключения к MySQL**

MySQL поднимается дольше backend. Стек использует healthcheck, поэтому обычно backend дожидается готовности базы автоматически. Если ошибка повторяется - проверьте корректность `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_DATABASE` в `.env.production`.

**Порт 80 занят**

Узнайте, что занимает порт:

```bash
sudo lsof -i :80
```

Остановите мешающий процесс или измените проброс порта в `docker-compose.prod.yml` (`"8080:80"`) и обращайтесь к приложению на порту 8080.

**Данные в базе исчезли после `docker compose down`**

Команда `down` без флага `-v` не трогает volumes. Если данные исчезли - скорее всего, был вызван `down -v`. Восстановите из резервной копии (см. раздел 8).
