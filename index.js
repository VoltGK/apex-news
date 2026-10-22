document.addEventListener("DOMContentLoaded", () => {
  const newsGrid = document.getElementById("news-grid");
  const navButtons = document.querySelectorAll(".nav-btn");

  const FALLBACK_IMAGE =
    "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop";
  const FALLBACK_AVATAR = "https://i.pravatar.cc/100?img=10";
  const MAX_ARTICLES = 39;
  const PER_SOURCE_LIMIT = 9;
  const FETCH_TIMEOUT_MS = 8000;

  const REFRESH_MS = 30 * 60 * 1000; // auto-refresh every 30 minutes

  let currentCategory = "all";

  const fallbackArticles = [
    {
      title: "GPT-5 & The Future of Autonomous AI Agents",
      category: "ai",
      reading_time: 10,
      cover_image:
        "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop",
      user: {
        name: "John Doe",
        profile_image: "https://i.pravatar.cc/100?img=12",
      },
      url: "https://dev.to",
      source: "DEV.to",
      description:
        "GPT-5 represents a significant leap in artificial intelligence, with capabilities that could redefine how we interact with machines.",
    },
    {
      title: "Quantum Computing Milestone Achieved",
      category: "hardware",
      reading_time: 7,
      cover_image:
        "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=600&auto=format&fit=crop",
      user: {
        name: "Jane Smith",
        profile_image: "https://i.pravatar.cc/100?img=32",
      },
      url: "https://dev.to",
      source: "DEV.to",
      description:
        "Scientists have achieved a breakthrough in quantum computing, marking a significant step toward unlocking quantum supremacy.",
    },
    {
      title: "Next-Gen Web Frameworks to Watch",
      category: "web",
      reading_time: 5,
      cover_image:
        "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=600&auto=format&fit=crop",
      user: {
        name: "Emily White",
        profile_image: "https://i.pravatar.cc/100?img=47",
      },
      url: "https://dev.to",
      source: "DEV.to",
      description:
        "The web development landscape is evolving rapidly with new tools designed to simplify complex applications and boost speed.",
    },
    {
      title: "NVIDIA Next-Gen GPU Architecture Leaks",
      category: "hardware",
      reading_time: 6,
      cover_image:
        "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=600&auto=format&fit=crop",
      user: {
        name: "Alex Johnson",
        profile_image: "https://i.pravatar.cc/100?img=15",
      },
      url: "https://dev.to",
      source: "DEV.to",
      description:
        "Exclusive leaks indicate NVIDIA is working on a revolutionary new GPU that redefines performance and energy efficiency.",
    },
  ];

  // ---------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------

  // Escape text before putting it into innerHTML
  function escapeHTML(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // Only allow http(s) links/images (blocks javascript: URLs etc.)
  function safeUrl(url, fallback) {
    try {
      const parsed = new URL(url);
      if (parsed.protocol === "http:" || parsed.protocol === "https:") {
        return parsed.href;
      }
    } catch (e) {
      /* invalid URL */
    }
    return fallback;
  }

  // Remove HTML tags without executing anything
  function stripHTML(html) {
    const doc = new DOMParser().parseFromString(String(html || ""), "text/html");
    return (doc.body.textContent || "").replace(/\s+/g, " ").trim();
  }

  // Cut at a word boundary so we never stop in the middle of a word
  function truncate(text, max) {
    if (text.length <= max) return text;
    const cut = text.slice(0, max);
    const lastSpace = cut.lastIndexOf(" ");
    return (lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[\s.,;:!-]+$/, "") + "…";
  }

  // Remove boilerplate that makes descriptions look bad
  function cleanDescription(text) {
    return text
      .replace(/The post .{0,200} appeared first on .{0,100}\.?$/i, "")
      .replace(/\bThe post\b.*$/i, "")
      .replace(/\s*(Read more|Continue reading|Read the full story)\W*$/i, "")
      .replace(/\[(…|\.\.\.)\]\s*$/, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  // Different fallback pictures per category (so cards don't all look the same)
  const FALLBACK_POOLS = {
    ai: [
      "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop",
    ],
    hardware: [
      "https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800&auto=format&fit=crop",
    ],
    web: [
      "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1555949963-ff9fe0c870eb?w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800&auto=format&fit=crop",
    ],
  };

  function pickFallbackImage(category, title) {
    const pool = FALLBACK_POOLS[category] || FALLBACK_POOLS.ai;
    let hash = 0;
    for (const ch of String(title)) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
    return pool[hash % pool.length];
  }

  // Match whole words only, so "ai" does not match "said" or "main"
  function hasWord(text, words) {
    return words.some((w) => {
      const safe = w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      return new RegExp(`(^|[^a-z0-9])${safe}([^a-z0-9]|$)`, "i").test(text);
    });
  }

  // Decide ai / web / hardware from title + tags.
  // Returns null when nothing matches (the card is then "tech": shown under All only)
  function guessCategory(title, tags) {
    const tagText = Array.isArray(tags)
      ? tags.join(" ")
      : typeof tags === "string"
        ? tags
        : "";
    const text = `${title || ""} ${tagText}`.toLowerCase();

    if (
      hasWord(text, [
        "ai", "gpt", "llm", "llms", "openai", "claude", "gemini", "chatgpt",
        "anthropic", "ml", "machine learning", "neural", "agent", "agents",
        "agentic", "copilot", "deepseek", "ollama", "mistral", "llama",
        "gemma", "diffusion", "chatbot", "generative", "artificial intelligence",
      ])
    )
      return "ai";

    if (
      hasWord(text, [
        "gpu", "cpu", "nvidia", "chip", "chips", "intel", "amd", "raspberry pi",
        "raspberry", "arduino", "esp32", "esp8266", "hardware", "quantum",
        "semiconductor", "processor", "laptop", "ssd", "ram", "pcb", "fpga",
        "microcontroller", "robot", "robotics", "drone", "battery", "3d printer",
        "3d printing", "motherboard", "monitor", "keyboard", "iot", "sensor",
        "soldering", "circuit", "rtx", "radeon", "snapdragon", "arm",
      ])
    )
      return "hardware";

    if (
      hasWord(text, [
        "javascript", "js", "react", "css", "html", "node", "nodejs", "frontend",
        "backend", "web", "typescript", "api", "vue", "svelte", "nextjs", "angular",
        "browser", "webdev", "php", "wordpress", "http", "wasm", "webassembly",
        "tailwind", "deno", "bun", "chrome", "firefox", "website", "websites",
        "devtools", "django", "laravel", "rails", "ux", "ui",
      ])
    )
      return "web";

    return null;
  }

  // Build an article in the exact shape renderArticles() expects
  function makeArticle(fields) {
    const category = guessCategory(fields.title, fields.tags) || "tech";
    const description = truncate(cleanDescription(stripHTML(fields.description)), 160);
    const readingTime = Number(fields.reading_time);
    return {
      title: fields.title || "Untitled",
      category,
      // null = unknown (we hide it instead of showing a made-up number)
      reading_time: readingTime > 0 ? Math.max(1, Math.round(readingTime)) : null,
      meta_label: fields.meta_label || "", // e.g. "485 points"
      cover_image: fields.cover_image || pickFallbackImage(category, fields.title),
      has_real_image: Boolean(fields.cover_image),
      user: {
        name: fields.author || "Tech Writer",
        profile_image: fields.avatar || FALLBACK_AVATAR,
      },
      url: fields.url,
      description,
      // true when the description is missing, too short, or boilerplate,
      // so loadPageMeta() will try to replace it with the real page summary
      needs_description:
        description.length < 40 ||
        /^(This is a submission for|Leave a comment below)/i.test(description),
      source: fields.source,
      published_at: fields.published_at,
    };
  }

  // ---------------------------------------------------------------
  // Sources: each one knows how to fetch + how to turn its own JSON
  // into a list of normalized articles
  // ---------------------------------------------------------------

  const rssSource = (name, feedUrl) => ({
    name,
    url: `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feedUrl)}`,
    parse: (data) =>
      (data.items || []).map((item) =>
        makeArticle({
          title: item.title,
          tags: item.categories,
          cover_image:
            item.thumbnail ||
            (item.enclosure && item.enclosure.link) ||
            (/<img[^>]+src=["']([^"']+)["']/i.exec(item.content || item.description || "") || [])[1],
          author: item.author || name,
          url: item.link,
          description: item.description,
          source: name,
          published_at: item.pubDate,
        }),
      ),
  });

  const SOURCES = [
    {
      name: "DEV.to",
      url: `https://dev.to/api/articles?per_page=${PER_SOURCE_LIMIT}`,
      // DEV.to returns a plain array
      parse: (data) =>
        (Array.isArray(data) ? data : []).map((item) =>
          makeArticle({
            title: item.title,
            tags: item.tag_list || item.tags,
            reading_time: item.reading_time_minutes,
            cover_image: item.cover_image || item.social_image,
            author: item.user && item.user.name,
            avatar: item.user && item.user.profile_image,
            url: item.url,
            description: item.description,
            source: "DEV.to",
            published_at: item.published_at,
          }),
        ),
    },
    {
      name: "Hacker News",
      url: `https://hn.algolia.com/api/v1/search?tags=front_page&hitsPerPage=${PER_SOURCE_LIMIT * 2}`,
      // Hacker News returns { hits: [...] } and has no images
      parse: (data) =>
        (data.hits || [])
          .filter((hit) => hit.url) // skip "Ask HN" text posts
          .slice(0, PER_SOURCE_LIMIT)
          .map((hit) =>
            makeArticle({
              title: hit.title,
              author: hit.author,
              url: hit.url,
              meta_label: `${hit.points || 0} points · ${hit.num_comments || 0} comments`,
              description: hit.story_text, // usually empty: filled in later by loadPageMeta()
              source: "Hacker News",
              published_at: hit.created_at,
            }),
          ),
    },
    {
      name: "Hashnode",
      url: "https://gql.hashnode.com",
      // Hashnode is GraphQL: needs POST, and returns { data: { feed: { edges } } }
      options: {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: `{
            feed(first: ${PER_SOURCE_LIMIT}, filter: { type: FEATURED }) {
              edges { node {
                title brief url publishedAt readTimeInMinutes
                coverImage { url }
                author { name profilePicture }
              } }
            }
          }`,
        }),
      },
      parse: (data) =>
        ((data.data && data.data.feed && data.data.feed.edges) || []).map(
          ({ node }) =>
            makeArticle({
              title: node.title,
              reading_time: node.readTimeInMinutes,
              cover_image: node.coverImage && node.coverImage.url,
              author: node.author && node.author.name,
              avatar: node.author && node.author.profilePicture,
              url: node.url,
              description: node.brief,
              source: "Hashnode",
              published_at: node.publishedAt,
            }),
        ),
    },
    {
      name: "Lobsters",
      url: "https://lobste.rs/hottest.json",
      // Lobsters returns a plain array
      parse: (data) =>
        (Array.isArray(data) ? data : [])
          .slice(0, PER_SOURCE_LIMIT)
          .map((item) =>
            makeArticle({
              title: item.title,
              tags: item.tags,
              author:
                typeof item.submitter_user === "object" && item.submitter_user
                  ? item.submitter_user.username
                  : item.submitter_user,
              url: item.url || item.comments_url || item.short_id_url,
              meta_label: `${item.score || 0} points · ${item.comment_count || 0} comments`,
              description: item.description, // filled in later by loadPageMeta() if empty
              source: "Lobsters",
              published_at: item.created_at,
            }),
          ),
    },
    rssSource("TechCrunch", "https://techcrunch.com/feed/"),
    rssSource("The Verge", "https://www.theverge.com/rss/index.xml"),
    rssSource("Ars Technica", "https://feeds.arstechnica.com/arstechnica/index"),
  ];

  // Copy a source but force every article into one category.
  // Used for sources that are dedicated to one topic (web dev or hardware).
  function withCategory(source, name, category, urlOverride) {
    return {
      ...source,
      name,
      url: urlOverride || source.url,
      parse: (data) =>
        source.parse(data).map((a) => ({
          ...a,
          category,
          cover_image: a.has_real_image ? a.cover_image : pickFallbackImage(category, a.title),
        })),
    };
  }

  const devTo = SOURCES[0];
  SOURCES.push(
    // Web development
    withCategory(devTo, "DEV.to #webdev", "web", "https://dev.to/api/articles?tag=webdev&per_page=6"),
    withCategory(rssSource("Smashing Magazine", "https://www.smashingmagazine.com/feed/"), "Smashing Magazine", "web"),
    withCategory(rssSource("CSS-Tricks", "https://css-tricks.com/feed/"), "CSS-Tricks", "web"),
    // Hardware / electronics
    withCategory(devTo, "DEV.to #hardware", "hardware", "https://dev.to/api/articles?tag=hardware&per_page=6"),
    withCategory(rssSource("Hackaday", "https://hackaday.com/blog/feed/"), "Hackaday", "hardware"),
    withCategory(rssSource("Tom's Hardware", "https://www.tomshardware.com/feeds/all"), "Tom's Hardware", "hardware"),
  );

  // Fetch one source with a timeout. Never throws: returns [] on any failure.
  async function loadSource(source) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
      const response = await fetch(source.url, {
        ...(source.options || {}),
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      const articles = source
        .parse(data)
        .filter((a) => a.title && safeUrl(a.url, null));
      console.log(`[news] ${source.name}: ${articles.length} articles`);
      return articles;
    } catch (error) {
      const reason = error.name === "AbortError" ? "timed out" : error.message;
      console.warn(`[news] ${source.name} failed: ${reason}`);
      return [];
    } finally {
      clearTimeout(timer);
    }
  }

  // Merge sources: dedupe by URL, newest first inside each source, then
  // take one article from each source in turn so no site dominates.
  function mergeArticles(lists) {
    const seen = new Set();
    const queues = lists.map((list) =>
      list
        .filter((a) => {
          const key = a.url.replace(/\/+$/, "");
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        })
        .sort(
          (a, b) =>
            (new Date(b.published_at) || 0) - (new Date(a.published_at) || 0),
        ),
    );

    const merged = [];
    while (merged.length < MAX_ARTICLES && queues.some((q) => q.length)) {
      for (const queue of queues) {
        if (queue.length && merged.length < MAX_ARTICLES) {
          merged.push(queue.shift());
        }
      }
    }
    return merged;
  }

  // ---------------------------------------------------------------
  // Rendering
  // ---------------------------------------------------------------

  function renderArticles(articlesToRender) {
    if (!newsGrid) return;
    newsGrid.innerHTML = "";

    articlesToRender.forEach((article) => {
      const card = document.createElement("div");
      card.className =
        "article-card bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between hover:border-indigo-500 transition-all duration-300 cursor-pointer shadow-lg group";
      card.setAttribute("data-category", article.category || "ai");

      const coverImage = escapeHTML(safeUrl(article.cover_image, FALLBACK_IMAGE));
      const authorName = escapeHTML(article.user?.name || "Tech Writer");
      const authorImg = escapeHTML(
        safeUrl(article.user?.profile_image, FALLBACK_AVATAR),
      );
      const targetUrl = safeUrl(article.url, "https://dev.to");
      const title = escapeHTML(article.title);
      const description = escapeHTML(
        article.description || `Read the full story on ${article.source || "the source"}.`,
      );
      const category = escapeHTML(article.category || "Tech");
      const source = escapeHTML(article.source || "");
      const sourceBadge = source
        ? `<span class="inline-block bg-amber-400/10 text-amber-400 text-xs font-medium px-2.5 py-1 rounded-md mb-2 ml-1">${source}</span>`
        : "";

      card.innerHTML = `
        <div>
          <img src="${coverImage}" alt="${title}" loading="lazy" class="card-img w-full h-48 object-cover rounded-lg mb-4 group-hover:opacity-90 transition-opacity">
          <span class="inline-block bg-indigo-500/20 text-indigo-400 text-xs font-semibold px-2.5 py-1 rounded-md mb-2 uppercase tracking-wide">${category}</span>${sourceBadge}
          <h3 class="card-title text-xl font-bold text-white mb-2 leading-snug group-hover:text-amber-400 transition-colors">${title}</h3>
          <p class="card-text text-slate-400 text-sm mb-4 line-clamp-3">${description}</p>
        </div>
        <div>
          <div class="flex items-center justify-between mt-4 pt-4 border-t border-slate-800">
            <div class="flex items-center space-x-3">
              <img src="${authorImg}" alt="${authorName}" class="w-8 h-8 rounded-full object-cover">
              <span class="text-xs text-slate-300 font-medium">${authorName}</span>
            </div>
            <span class="text-xs text-slate-500">${escapeHTML(article.meta_label || (article.reading_time ? article.reading_time + " min read" : ""))}</span>
          </div>
          <a href="${escapeHTML(targetUrl)}" target="_blank" rel="noopener noreferrer" class="read-more-btn mt-4 block w-full bg-amber-400 hover:bg-amber-500 text-slate-950 font-semibold px-4 py-2 rounded-lg text-sm transition-colors text-center">
            Read on ${source || "Source"} <i class="fa-solid fa-arrow-up-right-from-square ml-1.5 text-xs"></i>
          </a>
        </div>
      `;

      // If an image fails to load, swap in the fallback
      card.querySelectorAll("img").forEach((img) => {
        img.addEventListener(
          "error",
          () => {
            img.onerror = null;
            img.src = img.classList.contains("card-img")
              ? FALLBACK_IMAGE
              : FALLBACK_AVATAR;
          },
          { once: true },
        );
      });

      // Clicking anywhere on the card also opens the original article
      card.addEventListener("click", (e) => {
        if (!e.target.closest("a")) {
          window.open(targetUrl, "_blank", "noopener,noreferrer");
        }
      });

      article._card = card; // remember the card so we can update it later
      newsGrid.appendChild(card);
    });

    // Keep the selected category filter after (re)rendering
    applyCategoryFilter();
  }

  function applyCategoryFilter() {
    document.querySelectorAll(".article-card").forEach((card) => {
      const visible =
        currentCategory === "all" || card.dataset.category === currentCategory;
      card.classList.toggle("hidden", !visible);
    });
  }

  // ---------------------------------------------------------------
  // Start
  // ---------------------------------------------------------------

  // Initial render with fallbacks
  renderArticles(fallbackArticles);

  // ---------------------------------------------------------------
  // Page metadata (real image + description) for articles that lack them.
  // Uses the free Microlink API (limited requests per day), so results
  // are cached in the browser for 7 days. If it fails or is rate limited,
  // the cards simply keep their fallback picture.
  // ---------------------------------------------------------------

  const META_ENDPOINT = "https://api.microlink.io/?url=";
  const META_CACHE_PREFIX = "newsMeta:";
  const META_TTL_MS = 7 * 24 * 60 * 60 * 1000;
  const META_CONCURRENCY = 3;
  let metaRateLimited = false;

  function readMetaCache(url) {
    try {
      const raw = localStorage.getItem(META_CACHE_PREFIX + url);
      if (!raw) return null;
      const entry = JSON.parse(raw);
      return Date.now() - entry.t < META_TTL_MS ? entry : null;
    } catch (e) {
      return null;
    }
  }

  function writeMetaCache(url, meta) {
    try {
      localStorage.setItem(
        META_CACHE_PREFIX + url,
        JSON.stringify({ ...meta, t: Date.now() }),
      );
    } catch (e) {
      /* storage full or blocked: ignore */
    }
  }

  // Put image/description into the article object (and its card, if shown)
  function applyMeta(article, meta) {
    if (!meta) return;
    const image = safeUrl(meta.image, null);
    if (image && !article.has_real_image) {
      article.cover_image = image;
      article.has_real_image = true;
      const img = article._card && article._card.querySelector("img.card-img");
      if (img) img.src = image;
    }
    const description = truncate(cleanDescription(stripHTML(meta.description)), 160);
    if (description.length >= 40 && article.needs_description) {
      article.description = description;
      article.needs_description = false;
      const p = article._card && article._card.querySelector("p.card-text");
      if (p) p.textContent = description;
    }
  }

  async function fetchPageMeta(url) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
      const response = await fetch(META_ENDPOINT + encodeURIComponent(url), {
        signal: controller.signal,
      });
      if (response.status === 429) {
        metaRateLimited = true; // daily limit reached: stop asking
        throw new Error("rate limited");
      }
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const json = await response.json();
      const data = (json && json.data) || {};
      const meta = {
        image: (data.image && data.image.url) || null,
        description: data.description || "",
      };
      writeMetaCache(url, meta);
      return meta;
    } catch (error) {
      console.warn(`[news] page info failed for ${url}: ${error.message}`);
      return null;
    } finally {
      clearTimeout(timer);
    }
  }

  // Fill in cards one by one, a few at a time
  async function loadPageMeta(articles) {
    const queue = articles.filter((a) => !a.has_real_image || a.needs_description);
    const worker = async () => {
      while (queue.length && !metaRateLimited) {
        const article = queue.shift();
        applyMeta(article, await fetchPageMeta(article.url));
      }
    };
    await Promise.all(Array.from({ length: META_CONCURRENCY }, worker));
  }

  // Show "Live · updated 4:21 PM" in the green badge in the header
  function showUpdatedTime() {
    const badge = document.querySelector("header span.text-emerald-400");
    if (!badge) return;
    const time = new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    badge.textContent = `Live · updated ${time}`;
  }

  async function fetchLiveNews() {
    const lists = await Promise.all(SOURCES.map(loadSource));
    const articles = mergeArticles(lists);

    // Only replace the fallback cards if we really got something
    if (articles.length === 0) {
      console.warn("[news] All sources failed, keeping backup articles.");
      return;
    }

    // Use anything we already know from earlier visits, so cards look
    // complete immediately, then render
    articles.forEach((a) => applyMeta(a, readMetaCache(a.url)));
    renderArticles(articles);
    showUpdatedTime();

    // Then look up real images/descriptions for the rest, in the background
    loadPageMeta(articles.filter((a) => !readMetaCache(a.url)));
  }

  fetchLiveNews();
  // Refresh by itself while the tab is open and visible
  setInterval(() => {
    if (!document.hidden) fetchLiveNews();
  }, REFRESH_MS);

  // Category Filtering
  navButtons.forEach((button) => {
    button.addEventListener("click", () => {
      navButtons.forEach((btn) =>
        btn.classList.remove("bg-amber-400", "bg-indigo-400", "text-slate-950"),
      );
      button.classList.add(
        "text-slate-950",
        button.dataset.category === "all" ? "bg-amber-400" : "bg-indigo-400",
      );

      currentCategory = button.dataset.category;
      applyCategoryFilter();
    });
  });
});
