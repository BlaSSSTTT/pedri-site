// Збирає свіжі новини про Педрі з RSS-стрічок і зберігає в data/news.json.
// Запускається GitHub Actions за розкладом. Залежностей немає — потрібен лише Node 18+.
import { readFile, writeFile, mkdir } from "node:fs/promises";

const OUT = "data/news.json";
const MAX_ITEMS = 800;          // скільки матеріалів тримати
const MAX_AGE_DAYS = 60;        // старіші видаляються
const MATCH = /pedri|педрі|педри/i;

const gn = (q, hl, gl, ceid) =>
  `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=${hl}&gl=${gl}&ceid=${ceid}`;

const FEEDS = [
  { url: gn("Pedri when:7d", "es", "ES", "ES:es"), lang: "es" },
  { url: gn("Pedri Barça when:7d", "es", "ES", "ES:es"), lang: "es" },
  { url: gn("Pedri when:7d", "en-US", "US", "US:en"), lang: "en" },
  { url: gn("Pedri Barcelona when:7d", "en-GB", "GB", "GB:en"), lang: "en" },
  { url: gn("Педрі", "uk", "UA", "UA:uk"), lang: "uk" },
  { url: gn("Pedri when:7d", "fr", "FR", "FR:fr"), lang: "fr" },
  { url: gn("Pedri when:7d", "it", "IT", "IT:it"), lang: "it" },
  { url: gn("Pedri when:7d", "pt-BR", "BR", "BR:pt-419"), lang: "pt" },
  { url: "https://www.bing.com/news/search?q=Pedri+Barcelona&format=rss", lang: "" },
  { url: "https://www.reddit.com/r/Barca/search.rss?q=Pedri&restrict_sr=1&sort=new", lang: "en", source: "Reddit r/Barca", category: "social" },
  // YouTube: офіційний канал FC Barcelona (беремо лише відео, де в назві є Педрі)
  { url: "https://www.youtube.com/feeds/videos.xml?channel_id=UC14UlmYlSNiQCBe9Eookf_A", lang: "", source: "FC Barcelona (YouTube)", category: "video" },
];

const decode = (s = "") =>
  s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
   .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
   .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
   .replace(/&quot;/g, '"').replace(/&apos;|&#39;/g, "'")
   .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&")
   .replace(/<[^>]+>/g, "").trim();

const tag = (block, name) => {
  const m = block.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, "i"));
  return m ? decode(m[1]) : "";
};
const attr = (block, name, a) => {
  const m = block.match(new RegExp(`<${name}\\s[^>]*${a}="([^"]+)"`, "i"));
  return m ? decode(m[1]) : "";
};

export function parseFeed(xml, feed) {
  const items = [];
  const blocks = xml.match(/<item[\s>][\s\S]*?<\/item>|<entry[\s>][\s\S]*?<\/entry>/gi) || [];
  for (const b of blocks) {
    let title = tag(b, "title");
    let source = feed.source || tag(b, "source") || tag(b, "News:Source") || "";
    let url = tag(b, "link") || attr(b, "link", "href");
    const date = tag(b, "pubDate") || tag(b, "published") || tag(b, "updated");
    // Google News додає " - Назва видання" в кінці заголовка
    if (source && title.endsWith(" - " + source)) title = title.slice(0, -(" - " + source).length);
    else if (!source) {
      const m = title.match(/^(.*) - ([^-]{2,60})$/);
      if (m) { title = m[1]; source = m[2]; }
    }
    // Bing віддає посилання через редирект — дістаємо справжнє
    const real = url.match(/[?&]url=([^&]+)/);
    if (real && /bing\.com/.test(url)) url = decodeURIComponent(real[1]);
    if (!source) { try { source = new URL(url).hostname.replace(/^www\./, ""); } catch {} }
    const t = Date.parse(date);
    if (!title || !url || isNaN(t) || !MATCH.test(title)) continue;
    items.push({
      title, source, url,
      lang: feed.lang,
      category: feed.category || guessCategory(title),
      published: new Date(t).toISOString(),
    });
  }
  return items;
}

function guessCategory(title) {
  if (/instagram|insta\b|tiktok|twitter|\bx post|stories|story|redes sociales|publicaci[oó]n|post\b|інстаграм|соцмереж/i.test(title)) return "social";
  if (/\bv[ií]deo\b|youtube|highlights|відео/i.test(title)) return "video";
  return "news";
}

const norm = (s) => s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^\p{L}\p{N}]+/gu, " ").trim();

async function get(url) {
  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (pedri-news-bot; GitHub Actions)" } });
  if (!res.ok) throw new Error(res.status + " " + res.statusText);
  return res.text();
}

async function main() {
  let store = { updated: null, items: [] };
  try { store = JSON.parse(await readFile(OUT, "utf8")); } catch {}
  const seenUrl = new Set(store.items.map((i) => i.url));
  const seenTitle = new Set(store.items.map((i) => norm(i.title)));
  const now = new Date().toISOString();
  let added = 0;

  for (const feed of FEEDS) {
    try {
      const items = parseFeed(await get(feed.url), feed);
      for (const it of items) {
        const nt = norm(it.title);
        if (seenUrl.has(it.url) || seenTitle.has(nt)) continue;
        seenUrl.add(it.url); seenTitle.add(nt);
        store.items.push({ ...it, found: now });
        added++;
      }
      console.log(`OK  ${items.length} matched  ${feed.url.slice(0, 90)}`);
    } catch (e) {
      console.log(`ERR ${e.message}  ${feed.url.slice(0, 90)}`);
    }
  }

  const cutoff = Date.now() - MAX_AGE_DAYS * 86400000;
  store.items = store.items
    .filter((i) => Date.parse(i.published) > cutoff)
    .sort((a, b) => Date.parse(b.published) - Date.parse(a.published))
    .slice(0, MAX_ITEMS);
  store.updated = now;

  await mkdir("data", { recursive: true });
  await writeFile(OUT, JSON.stringify(store, null, 1));
  console.log(`Added ${added}, total ${store.items.length}`);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
