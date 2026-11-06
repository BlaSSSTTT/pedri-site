# Педрі — стрічка новин

Сайт збирає свіжі новини, пости й відео про Педрі та показує їх стрічкою з посиланням на першоджерело.

- `index.html` — сам сайт
- `data/curated.json` — 35 відібраних матеріалів з українськими описами (стартове наповнення)
- `data/news.json` — новини, які бот збирає автоматично
- `scripts/fetch.mjs` — скрипт збору (Google News, Bing News, Reddit r/Barca, YouTube FC Barcelona)
- `.github/workflows/update.yml` — запуск скрипта кожні 30 хвилин

## Як задеплоїти (≈10 хвилин)

1. Зайди на github.com → **New repository**. Назва, наприклад, `pedri`. Тип — **Public**. Галочки нічого не став → **Create repository**.
2. На сторінці порожнього репозиторію натисни **uploading an existing file**.
3. Розпакуй архів і **перетягни весь вміст папки** (не саму папку, а все, що всередині: `index.html`, `README.md`, `data`, `scripts`, `.github`) у вікно браузера → **Commit changes**.
   - Папка `.github` на Mac/Windows може бути прихована. Увімкни показ прихованих файлів (Mac: `Cmd+Shift+.`, Windows: Провідник → Вигляд → Приховані елементи) або створи файл вручну: **Add file → Create new file**, назва `.github/workflows/update.yml`, встав вміст із архіву.
4. **Settings → Actions → General** → внизу «Workflow permissions» → **Read and write permissions** → **Save**.
5. **Settings → Pages** → Source: **Deploy from a branch**, Branch: **main**, папка **/(root)** → **Save**.
6. **Actions** → зліва «Оновлення новин» → **Run workflow** → **Run workflow**. Через хвилину новини з'являться.
7. Через 1–2 хвилини сайт буде за адресою `https://<твій-нік>.github.io/pedri/`.

Далі все працює саме: GitHub кожні 30 хвилин збирає нове й оновлює сайт. Безкоштовно.

## Корисно знати

- GitHub може запускати розклад із затримкою 5–15 хвилин у години пік — це нормально.
- Якщо в репозиторії 60 днів не було жодної активності, GitHub вимикає розклад. Бот сам робить коміти, тож це не має статися; якщо раптом — Actions → Enable workflow.
- Автоматичні новини показуються мовою оригіналу. Відібрані матеріали з `curated.json` — українською з описами.
