/**
 * Academic PKM — Dynamic Layout & Asset Loader
 * Zero-build, client-side, 100% offline-friendly layout manager.
 * Wraps minimal note contents with sidebars, headers, and Table of Contents.
 */

(function () {
  // 1. Identify root path based on the script tag src
  const scriptEl = document.querySelector('script[src*="pkm-loader.js"]');
  const src = scriptEl ? scriptEl.getAttribute('src') : '';
  const rootPath = src.substring(0, src.indexOf('pkm-loader.js'));

  // 2. Queue up required stylesheet injections
  injectStylesheet(`${rootPath}styles.css`);
  injectStylesheet(`${rootPath}prism.css`);

  // Load course-specific shared styles if needed
  document.addEventListener("DOMContentLoaded", () => {
    const article = document.querySelector("article.content-body");
    if (article) {
      const courseId = article.getAttribute("data-course");
      if (courseId === "discrete-math") {
        injectStylesheet(`${rootPath}discrete-math/shared.css`);
      }
    }
  });

  // 3. Load the configuration database
  const configScript = document.createElement("script");
  configScript.src = `${rootPath}pkm-config.js`;
  configScript.onload = () => {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", initializePKMLayout);
    } else {
      initializePKMLayout();
    }
  };
  document.head.appendChild(configScript);

  /**
   * Dynamically appends a stylesheet to the head
   */
  function injectStylesheet(href) {
    if (document.querySelector(`link[href="${href}"]`)) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    document.head.appendChild(link);
  }

  /**
   * Dynamically loads a script file and returns a Promise
   */
  function loadScript(url) {
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = url;
      script.defer = true;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  /**
   * Main Orchestrator: Wraps the DOM content and activates layouts
   */
  async function initializePKMLayout() {
    const article = document.querySelector("article.content-body");
    if (!article) return;

    const courseId = article.getAttribute("data-course");
    const weekNum = parseInt(article.getAttribute("data-week"), 10);
    const isCourseIndex = article.hasAttribute("data-course-index");

    // Retrieve database objects
    const currentCourse = PKM_CONFIG.courses.find(c => c.id === courseId);
    const currentWeekData = currentCourse && !isNaN(weekNum) 
      ? currentCourse.weeks.find(w => w.num === weekNum)
      : null;

    // Apply document title and description from config if not customized
    if (currentWeekData) {
      document.title = `Week ${currentWeekData.num}: ${currentWeekData.title} | ${currentCourse.title}`;
      let metaDesc = document.querySelector('meta[name="description"]');
      if (!metaDesc) {
        metaDesc = document.createElement("meta");
        metaDesc.name = "description";
        document.head.appendChild(metaDesc);
      }
      metaDesc.content = currentWeekData.topics;
    } else if (currentCourse && isCourseIndex) {
      document.title = `${currentCourse.title} — Course Index | ${PKM_CONFIG.siteTitle}`;
    }

    // Wrap the body layout structure
    setupDOMWrappers(article, currentCourse, currentWeekData, isCourseIndex);

    // Load dynamic page features (Prism, KaTeX, Polyfills)
    const features = [];
    
    // Check if code block exists
    if (article.querySelector("pre code")) {
      features.push(loadScript(`${rootPath}prism.js`));
    }

    // Check if Math notation exists
    if (article.innerText.includes("$")) {
      injectStylesheet("https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css");
      features.push(
        loadScript("https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js")
          .then(() => loadScript("https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js"))
          .then(() => {
            renderMathInElement(document.body, {
              delimiters: [
                { left: "$$", right: "$$", display: true },
                { left: "$", right: "$", display: false }
              ]
            });
          })
      );
    }

    // Polyfills for popovers and CSS Anchor Positioning
    features.push(loadPolyfills());

    // Wait for all scripts to load, then initialize layout actions
    await Promise.all(features);

    initSidebar();
    initTableOfContents();
    initHoverPreviews();
    if (isCourseIndex && currentCourse) {
      initCourseIndexToggles(currentCourse.id);
    }
  }

  /**
   * Restructures the HTML markup to match the 3-column PKM layout shell.
   */
  function setupDOMWrappers(article, currentCourse, currentWeekData, isCourseIndex) {
    const originalBodyElements = Array.from(document.body.children).filter(el => el !== scriptEl && el.tagName !== "SCRIPT" && el !== article);

    // 1. Create main container
    const appContainer = document.createElement("div");
    appContainer.className = "app-container";

    // 2. Build Sidebar
    const sidebar = document.createElement("aside");
    sidebar.className = "sidebar";
    sidebar.id = "sidebar";
    
    const sidebarHeader = document.createElement("div");
    sidebarHeader.className = "sidebar-header";
    const sidebarTitleLink = document.createElement("a");
    sidebarTitleLink.href = `${rootPath}index.html`;
    sidebarTitleLink.className = "sidebar-title";
    sidebarTitleLink.textContent = PKM_CONFIG.siteTitle;
    sidebarHeader.appendChild(sidebarTitleLink);
    sidebar.appendChild(sidebarHeader);

    const sidebarNav = document.createElement("nav");
    sidebarNav.className = "sidebar-nav";

    // Sidebar: Navigation section
    const navSection = document.createElement("div");
    navSection.className = "nav-section";
    const navSectionTitle = document.createElement("h3");
    navSectionTitle.className = "nav-section-title";
    navSectionTitle.textContent = "Navigation";
    navSection.appendChild(navSectionTitle);

    const navList = document.createElement("ul");
    navList.className = "nav-list";
    const dashboardItem = document.createElement("li");
    dashboardItem.className = "nav-item";
    dashboardItem.innerHTML = `
      <a href="${rootPath}index.html" class="nav-link ${rootPath === '' || rootPath === './' ? 'active' : ''}">
        <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>
        Dashboard
      </a>
    `;
    navList.appendChild(dashboardItem);
    navSection.appendChild(navList);
    sidebarNav.appendChild(navSection);

    // Sidebar: Courses section
    const coursesSection = document.createElement("div");
    coursesSection.className = "nav-section";
    const coursesTitle = document.createElement("h3");
    coursesTitle.className = "nav-section-title";
    coursesTitle.textContent = "Courses";
    coursesSection.appendChild(coursesTitle);

    const coursesList = document.createElement("ul");
    coursesList.className = "nav-list";

    PKM_CONFIG.courses.forEach(course => {
      const courseItem = document.createElement("li");
      courseItem.className = "nav-item";
      const coursePath = course.folder 
        ? `${rootPath}${course.folder}/${course.indexFile}`
        : `${rootPath}${course.indexFile}`;
      const isActive = currentCourse && currentCourse.id === course.id && (isCourseIndex || !currentWeekData);
      courseItem.innerHTML = `
        <a href="${coursePath}" class="nav-link ${isActive ? 'active' : ''}">
          <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
          ${course.title}
        </a>
      `;
      coursesList.appendChild(courseItem);
    });
    coursesSection.appendChild(coursesList);
    sidebarNav.appendChild(coursesSection);

    // Sidebar: Current Course Weeks Section (only if we're in a course context)
    if (currentCourse && currentCourse.weeks && currentCourse.weeks.length > 0) {
      const weeksSection = document.createElement("div");
      weeksSection.className = "nav-section";
      const weeksTitle = document.createElement("h3");
      weeksTitle.className = "nav-section-title";
      weeksTitle.textContent = "Weeks";
      weeksSection.appendChild(weeksTitle);

      const weeksList = document.createElement("ul");
      weeksList.className = "nav-list";

      currentCourse.weeks.forEach(week => {
        const weekItem = document.createElement("li");
        weekItem.className = "nav-item";
        const weekPath = currentCourse.folder 
          ? `${rootPath}${currentCourse.folder}/${week.file}`
          : `${rootPath}${week.file}`;
        const isWeekActive = currentWeekData && currentWeekData.num === week.num;
        weekItem.innerHTML = `
          <a href="${weekPath}" class="nav-link ${isWeekActive ? 'active' : ''}">
            Week ${week.num} — ${week.title.split(" — ")[0].split(" & ")[0]}
          </a>
        `;
        weeksList.appendChild(weekItem);
      });
      weeksSection.appendChild(weeksList);
      sidebarNav.appendChild(weeksSection);
    }

    sidebar.appendChild(sidebarNav);
    appContainer.appendChild(sidebar);

    // 3. Build Center Column (Main Content)
    const mainContent = document.createElement("main");
    mainContent.className = "main-content";

    // Injected Header
    const mainHeader = document.createElement("header");
    mainHeader.className = "main-header";
    
    const headerLeft = document.createElement("div");
    headerLeft.className = "header-left";
    headerLeft.innerHTML = `
      <button id="toggle-sidebar" class="icon-btn" aria-label="Toggle Navigation Sidebar">
        <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16"/></svg>
      </button>
    `;

    // Dynamically build Breadcrumbs
    const breadcrumb = document.createElement("div");
    breadcrumb.className = "breadcrumb";
    breadcrumb.id = "breadcrumb";
    let breadcrumbHTML = `<a href="${rootPath}index.html" style="color:var(--text-muted);text-decoration:none;">Home</a>`;

    if (currentCourse) {
      const coursePath = currentCourse.folder 
        ? `${rootPath}${currentCourse.folder}/${currentCourse.indexFile}`
        : `${rootPath}${currentCourse.indexFile}`;
      
      breadcrumbHTML += `
        <span class="breadcrumb-separator">/</span>
        <a href="${coursePath}" style="color:var(--text-muted);text-decoration:none;">${currentCourse.title}</a>
      `;
    }
    if (currentWeekData) {
      breadcrumbHTML += `
        <span class="breadcrumb-separator">/</span>
        <span class="breadcrumb-current">Week ${currentWeekData.num}</span>
      `;
    } else if (isCourseIndex) {
      breadcrumbHTML += `
        <span class="breadcrumb-separator">/</span>
        <span class="breadcrumb-current">Overview</span>
      `;
    } else if (rootPath === "") {
      breadcrumbHTML += `
        <span class="breadcrumb-separator">/</span>
        <span class="breadcrumb-current">Dashboard</span>
      `;
    }
    breadcrumb.innerHTML = breadcrumbHTML;
    headerLeft.appendChild(breadcrumb);
    mainHeader.appendChild(headerLeft);
    mainContent.appendChild(mainHeader);

    // Scrollable content body wrapper
    const contentWrapper = document.createElement("div");
    contentWrapper.className = "content-wrapper";

    // 4. Injected Week Meta Header (if we're inside a note page)
    if (currentWeekData && !article.querySelector(".week-header")) {
      const weekHeader = document.createElement("div");
      weekHeader.className = "week-header";

      // Calculate progress indicator
      const courseWeeks = currentCourse.weeks;
      const weekIdx = courseWeeks.findIndex(w => w.num === currentWeekData.num);
      const progressPercent = ((weekIdx + 1) / courseWeeks.length) * 100;

      weekHeader.innerHTML = `
        <div class="week-header-meta">
          <span class="week-label">Week ${currentWeekData.num} &bull; ${currentCourse.title}</span>
          <span class="difficulty-badge badge-${currentWeekData.difficulty.toLowerCase()}">${currentWeekData.difficulty}</span>
        </div>
        <h1 id="${currentWeekData.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}">${currentWeekData.title}</h1>
        <p class="week-header-subtitle">${currentWeekData.topics.split(" · ").slice(0, 3).join(" · ")}</p>
        <div class="week-reading-time">
          <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path stroke-linecap="round" d="M12 6v6l4 2"/></svg>
          Estimated reading & study time: ${currentWeekData.readingTime}
        </div>
        <div class="week-arc">
          <span class="week-arc-label">Course Progress</span>
          <div class="week-arc-track">
            <div class="week-arc-fill" style="width: ${progressPercent}%;"></div>
          </div>
          <span class="week-arc-label">Week ${weekIdx + 1} of ${courseWeeks.length}</span>
        </div>
      `;
      // Insert metadata header as the first element of article
      article.insertBefore(weekHeader, article.firstChild);
    }

    // Move backlinks section to the end of the article if not already inside backlinks-section
    let backlinksSection = article.querySelector(".backlinks-section");
    if (!backlinksSection) {
      // Create empty backlinks grid if none defined
      backlinksSection = document.createElement("section");
      backlinksSection.className = "backlinks-section";
      backlinksSection.innerHTML = `
        <h2 class="backlinks-title" id="backlinks">
          <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/></svg>
          Linked Backlinks
        </h2>
        <div class="backlinks-grid">
          <a href="${rootPath}index.html" class="backlink-card">
            <div class="backlink-title">Dashboard Index</div>
            <div class="backlink-excerpt">Linked study dashboard containing an index of all courses and active lecture series.</div>
          </a>
        </div>
      `;
      article.appendChild(backlinksSection);
    }

    // 4.5. Generate next/prev navigation footer if note page
    if (currentWeekData) {
      const weekNav = document.createElement("div");
      weekNav.className = "week-nav";

      const courseWeeks = currentCourse.weeks;
      const weekIdx = courseWeeks.findIndex(w => w.num === currentWeekData.num);

      let prevLinkHTML = "";
      if (weekIdx > 0) {
        const prevWeek = courseWeeks[weekIdx - 1];
        prevLinkHTML = `
          <a href="${rootPath}${currentCourse.folder}/${prevWeek.file}" class="week-nav-link">
            <span class="week-nav-arrow"><svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/></svg></span>
            <div>
              <div class="week-nav-label">Previous — Week ${prevWeek.num}</div>
              <div class="week-nav-title">${prevWeek.title.split(" — ")[0].split(" & ")[0]}</div>
            </div>
          </a>
        `;
      } else {
        prevLinkHTML = `
          <a href="${rootPath}${currentCourse.folder}/${currentCourse.indexFile}" class="week-nav-link">
            <span class="week-nav-arrow"><svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/></svg></span>
            <div>
              <div class="week-nav-label">Back to</div>
              <div class="week-nav-title">Course Index</div>
            </div>
          </a>
        `;
      }

      let nextLinkHTML = "";
      if (weekIdx < courseWeeks.length - 1) {
        const nextWeek = courseWeeks[weekIdx + 1];
        nextLinkHTML = `
          <a href="${rootPath}${currentCourse.folder}/${nextWeek.file}" class="week-nav-link next">
            <span class="week-nav-arrow"><svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/></svg></span>
            <div>
              <div class="week-nav-label">Next — Week ${nextWeek.num}</div>
              <div class="week-nav-title">${nextWeek.title.split(" — ")[0].split(" & ")[0]}</div>
            </div>
          </a>
        `;
      }

      weekNav.innerHTML = prevLinkHTML + nextLinkHTML;
      article.appendChild(weekNav);
    }

    // 4.6. Generate Course Index elements if it's a course index page
    if (isCourseIndex && currentCourse) {
      // Create Course Index content dynamically
      const courseHero = document.createElement("div");
      courseHero.className = "course-hero";
      courseHero.innerHTML = `
        <p class="course-hero-label">Course Index &bull; ${currentCourse.title}</p>
        <h1 id="${currentCourse.id}">${currentCourse.title}</h1>
        <p class="course-hero-description">${currentCourse.description}</p>
        <div class="course-stats">
          <div class="stat-item">
            <span class="stat-value">${currentCourse.weeks.length}</span>
            <span class="stat-label">Weeks</span>
          </div>
          <div class="stat-item">
            <span class="stat-value" id="completed-count">0</span>
            <span class="stat-label">Completed</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">${currentCourse.studyTime}</span>
            <span class="stat-label">Total Study Time</span>
          </div>
        </div>
      `;
      // Prepend courseHero to the article
      article.insertBefore(courseHero, article.firstChild);

      // Create weeks grid section
      const weeksGridHeader = document.createElement("h2");
      weeksGridHeader.id = "weekly-materials";
      weeksGridHeader.textContent = "Weekly Materials";

      const weeksGridDesc = document.createElement("p");
      weeksGridDesc.textContent = "Each card links to a full learning page. Check off weeks as you complete them — your progress is saved locally in your browser.";

      const weeksGrid = document.createElement("div");
      weeksGrid.className = "weeks-grid";
      weeksGrid.id = "weeks-grid";

      currentCourse.weeks.forEach(week => {
        const weekPath = currentCourse.folder 
          ? `${rootPath}${currentCourse.folder}/${week.file}`
          : `${rootPath}${week.file}`;
        
        const card = document.createElement("a");
        card.href = weekPath;
        card.className = "week-card";
        card.setAttribute("data-week", week.num);
        card.innerHTML = `
          <div class="week-number">Week ${week.num}</div>
          <div class="week-card-body">
            <div class="week-card-title">${week.title}</div>
            <div class="week-card-topics">${week.topics}</div>
          </div>
          <div class="week-card-meta">
            <span class="difficulty-badge badge-${week.difficulty.toLowerCase()}">${week.difficulty}</span>
            <input type="checkbox" class="week-done-toggle" data-week="${week.num}" title="Mark Week ${week.num} as complete" aria-label="Mark Week ${week.num} as complete">
          </div>
        `;
        weeksGrid.appendChild(card);
      });

      article.appendChild(weeksGridHeader);
      article.appendChild(weeksGridDesc);
      article.appendChild(weeksGrid);
    }

    // Append article content inside contentWrapper
    contentWrapper.appendChild(article);
    mainContent.appendChild(contentWrapper);
    appContainer.appendChild(mainContent);

    // 5. Build Right Column (Table of Contents Container)
    const tocContainer = document.createElement("aside");
    tocContainer.className = "toc-container";
    tocContainer.innerHTML = `
      <h3 class="toc-title">On This Page</h3>
      <ul class="toc-list">
        <li class="toc-item"><a href="#" class="toc-link">Loading...</a></li>
      </ul>
    `;
    appContainer.appendChild(tocContainer);

    // Clean body and insert app container
    originalBodyElements.forEach(el => el.remove());
    document.body.appendChild(appContainer);
  }

  /**
   * Load Polyfills for Popover and Anchor Positioning if not natively supported.
   */
  async function loadPolyfills() {
    const polyfills = [];

    // Check Popover support
    if (!HTMLElement.prototype.hasOwnProperty("popover")) {
      polyfills.push(import("https://unpkg.com/@oddbird/popover-polyfill@1.2.6/dist/popover-polyfill.js"));
    }

    // Check Interest Invokers support (interestfor)
    if (!HTMLButtonElement.prototype.hasOwnProperty("interestForElement")) {
      polyfills.push(import("https://unpkg.com/interestfor@0.1.1/dist/interestfor.js"));
    }

    // Check CSS Anchor Positioning support
    if (!("anchorName" in document.documentElement.style)) {
      polyfills.push(import("https://unpkg.com/@oddbird/css-anchor-positioning@0.1.6/dist/css-anchor-positioning.js"));
    }

    if (polyfills.length > 0) {
      try {
        await Promise.all(polyfills);
      } catch (err) {
        console.warn("Failed to load some polyfills.", err);
      }
    }
  }

  /**
   * Collapsible Sidebar logic
   */
  function initSidebar() {
    const container = document.querySelector(".app-container");
    const toggleBtn = document.getElementById("toggle-sidebar");
    
    if (!toggleBtn || !container) return;

    toggleBtn.addEventListener("click", () => {
      container.classList.toggle("sidebar-collapsed");
      if (window.innerWidth <= 768) {
        container.classList.toggle("sidebar-open");
      }
      const isCollapsed = container.classList.contains("sidebar-collapsed");
      localStorage.setItem("pkm-sidebar-collapsed", isCollapsed);
    });

    if (window.innerWidth > 768) {
      const wasCollapsed = localStorage.getItem("pkm-sidebar-collapsed") === "true";
      if (wasCollapsed) {
        container.classList.add("sidebar-collapsed");
      }
    }
  }

  /**
   * Auto-generates Table of Contents based on H2 and H3 elements inside the article.
   */
  function initTableOfContents() {
    const contentBody = document.querySelector(".content-body");
    const tocList = document.querySelector(".toc-list");
    
    if (!contentBody || !tocList) return;

    const headings = contentBody.querySelectorAll("h2, h3");
    
    if (headings.length === 0) {
      const tocContainer = document.querySelector(".toc-container");
      if (tocContainer) tocContainer.style.display = "none";
      return;
    }

    tocList.innerHTML = "";

    const headingObserverOptions = {
      root: null,
      rootMargin: "-80px 0px -60% 0px",
      threshold: 0
    };

    const activeLinks = new Map();

    headings.forEach((heading, idx) => {
      if (!heading.id) {
        heading.id = heading.textContent
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "");
        
        if (document.getElementById(heading.id) !== heading) {
          heading.id = `${heading.id}-${idx}`;
        }
      }

      const li = document.createElement("li");
      li.className = `toc-item toc-item-${heading.tagName.toLowerCase()}`;
      
      const a = document.createElement("a");
      a.href = `#${heading.id}`;
      a.className = "toc-link";
      a.textContent = heading.textContent.replace(/^\d+\s+/, ""); // remove section numbers in ToC for cleanliness
      
      li.appendChild(a);
      tocList.appendChild(li);

      activeLinks.set(heading, a);
    });

    const observer = new IntersectionObserver((entries) => {
      const visibleHeading = entries.find(entry => entry.isIntersecting);
      if (visibleHeading) {
        tocList.querySelectorAll(".toc-link").forEach(link => link.classList.remove("active"));
        const activeLink = activeLinks.get(visibleHeading.target);
        if (activeLink) {
          activeLink.classList.add("active");
        }
      }
    }, headingObserverOptions);

    headings.forEach(heading => observer.observe(heading));
  }

  /**
   * Automatically sets up popovers and binds anchors for interest-triggered hover previews.
   * Eliminates the need to write static <div popover="hint"> tags in notes files.
   */
  function initHoverPreviews() {
    const triggers = document.querySelectorAll("[interestfor]");
    if (triggers.length === 0) return;

    // Create a dynamic style element for the page's anchor bindings
    const styleEl = document.createElement("style");
    let styleRules = "";

    triggers.forEach((trigger, index) => {
      const popoverId = trigger.getAttribute("interestfor");
      let popoverTarget = document.getElementById(popoverId);

      // Dynamically generate the popover element if it doesn't exist in the page
      if (!popoverTarget) {
        popoverTarget = buildDynamicPopover(popoverId);
      }

      if (popoverTarget) {
        const anchorName = `--preview-anchor-${index}`;
        styleRules += `
          [interestfor="${popoverId}"] {
            anchor-name: ${anchorName};
          }
          #${popoverId} {
            position-anchor: ${anchorName};
          }
        `;
      }
    });

    styleEl.textContent = styleRules;
    document.head.appendChild(styleEl);
    
    if (window.CSSAnchorPositioning) {
      window.CSSAnchorPositioning.processSheets();
    }
  }

  /**
   * Dynamic Popover Builder
   * Uses configuration database metadata to construct popover peeks on the fly.
   */
  function buildDynamicPopover(popoverId) {
    // Determine note coordinates from id (e.g. preview-week-9 or preview-discrete-math)
    let title = "Reference Note";
    let body = "Overview detail of the linked reference document.";
    let footer = "";

    if (popoverId === "preview-dashboard") {
      title = "Academic Life Hub Dashboard";
      body = "The central index dashboard for the college study system. Contains navigation links to all study notes, backlinks, and study progress trackers.";
      footer = "Link: index.html";
    } else {
      // Find course or week from pkm-config.js
      let matchFound = false;
      
      // Check if it matches a course index (e.g. preview-discrete-math)
      const courseKey = popoverId.replace("preview-", "");
      const course = PKM_CONFIG.courses.find(c => c.id === courseKey);
      
      if (course) {
        title = course.title;
        title += " — Course Index";
        body = `Weekly learning materials covering ${course.weeks.map(w => w.title.split(" & ")[0].split(" — ")[0]).slice(0, 3).join(", ")} and others.`;
        footer = `${course.weeks.length} Weeks &bull; Study Materials`;
        matchFound = true;
      } else {
        // Check if it matches a week (e.g. preview-discrete-math-week-9 or similar link interestfor tags)
        for (const c of PKM_CONFIG.courses) {
          // Detect tag format (e.g. preview-discrete-math-9 or preview-week-9)
          const weekMatch = popoverId.match(/(\d+)/);
          if (weekMatch) {
            const weekNum = parseInt(weekMatch[1], 10);
            const week = c.weeks.find(w => w.num === weekNum);
            if (week) {
              title = week.title;
              body = week.topics;
              footer = `Course: ${c.title} &bull; ${week.readingTime}`;
              matchFound = true;
              break;
            }
          }
        }
      }

      if (!matchFound) {
        // Fallback for general preview
        return null;
      }
    }

    const popoverDiv = document.createElement("div");
    popoverDiv.setAttribute("popover", "hint");
    popoverDiv.id = popoverId;
    popoverDiv.innerHTML = `
      <div class="preview-title">${title}</div>
      <div class="preview-body">${body}</div>
      <div class="preview-footer">
        <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/></svg>
        ${footer}
      </div>
    `;

    document.body.appendChild(popoverDiv);
    return popoverDiv;
  }

  /**
   * Initializes checkboxes and persists completion status inside local storage.
   */
  function initCourseIndexToggles(courseId) {
    const PREFIX = `pkm-${courseId}-week-done-`;
    const toggles = document.querySelectorAll('.week-done-toggle');
    const completedCount = document.getElementById('completed-count');

    function updateCount() {
      let done = 0;
      toggles.forEach(t => { if (t.checked) done++; });
      if (completedCount) completedCount.textContent = done;
    }

    // Restore saved states
    toggles.forEach(toggle => {
      const week = toggle.dataset.week;
      const saved = localStorage.getItem(PREFIX + week) === 'true';
      toggle.checked = saved;
      const card = toggle.closest('.week-card');
      if (saved && card) card.classList.add('completed');
    });

    updateCount();

    // Handle toggle changes
    toggles.forEach(toggle => {
      toggle.addEventListener('change', (e) => {
        e.stopPropagation(); // prevent card navigation
        const week = toggle.dataset.week;
        const card = toggle.closest('.week-card');
        localStorage.setItem(PREFIX + week, toggle.checked);
        if (card) card.classList.toggle('completed', toggle.checked);
        updateCount();
      });

      // Prevent checkbox click from triggering anchor navigation
      toggle.addEventListener('click', (e) => e.stopPropagation());
    });
  }

})();
