-- init.sql: schema + test data for MVP

-- Ensure MySQL interprets this file as UTF-8.
SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  color VARCHAR(7) NOT NULL UNIQUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS projects (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT FALSE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS criteria (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  max_score TINYINT NOT NULL DEFAULT 5
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS votes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  project_id INT NOT NULL,
  criteria_id INT NOT NULL,
  score TINYINT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_votes_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_votes_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  CONSTRAINT fk_votes_criteria FOREIGN KEY (criteria_id) REFERENCES criteria(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Test data
INSERT INTO users (username, password_hash, display_name, color)
VALUES
  ('judge1', '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'Эксперт 1', '#FF6B6B'),
  ('judge2', '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'Эксперт 2', '#4ECDC4'),
  ('judge3', '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'Эксперт 3', '#FFE66D')
ON DUPLICATE KEY UPDATE
  password_hash = VALUES(password_hash);

INSERT INTO projects (title, description, is_active)
VALUES
  ('EcoTrack — приложение для отслеживания углеродного следа', 'EcoTrack помогает командам измерять и снижать углеродный след с помощью простых метрик, аналитики и привычек.', TRUE)
ON DUPLICATE KEY UPDATE
  title = VALUES(title),
  description = VALUES(description),
  is_active = VALUES(is_active);

INSERT INTO criteria (name, max_score)
VALUES
  ('Инновационность', 5),
  ('Реализуемость', 5),
  ('Финансовый эффект', 5),
  ('Стратегическая согласованность', 5),
  ('Влияние на операционную деятельность (процесс)', 5)
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  max_score = VALUES(max_score);

