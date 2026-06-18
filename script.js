/**
 * Academic PKM Layout & Interactive Functions
 */

document.addEventListener("DOMContentLoaded", async () => {
  // 1. Load Polyfills for Popover and Anchor Positioning if needed
  await loadPolyfills();

  // 2. Initialize Sidebar Controls
  initSidebar();

  // 3. Generate Table of Contents & Intersection Observer
  initTableOfContents();

  // 4. Initialize Hover Previews (interestfor dynamic setup)
  initHoverPreviews();
});

/**
 * Dynamically loads required modern web polyfills if not supported natively.
 */
async function loadPolyfills() {
  const polyfills = [];

  // Check Popover support
  if (!HTMLElement.prototype.hasOwnProperty("popover")) {
    console.log("Polyfilling Popover API...");
    polyfills.push(import("https://unpkg.com/@oddbird/popover-polyfill@1.2.6/dist/popover-polyfill.js"));
  }

  // Check Interest Invokers support (interestfor)
  if (!HTMLButtonElement.prototype.hasOwnProperty("interestForElement")) {
    console.log("Polyfilling Interest Invokers (interestfor)...");
    polyfills.push(import("https://unpkg.com/interestfor@0.1.1/dist/interestfor.js"));
  }

  // Check CSS Anchor Positioning support
  if (!("anchorName" in document.documentElement.style)) {
    console.log("Polyfilling CSS Anchor Positioning...");
    polyfills.push(import("https://unpkg.com/@oddbird/css-anchor-positioning@0.1.6/dist/css-anchor-positioning.js"));
  }

  if (polyfills.length > 0) {
    try {
      await Promise.all(polyfills);
      console.log("All required polyfills loaded successfully.");
    } catch (err) {
      console.warn("Failed to load some polyfills. Some features might not work on legacy browsers.", err);
    }
  }
}

/**
 * Sets up the collapsible sidebar behavior
 */
function initSidebar() {
  const container = document.querySelector(".app-container");
  const toggleBtn = document.getElementById("toggle-sidebar");
  
  if (!toggleBtn || !container) return;

  // Toggle sidebar state
  toggleBtn.addEventListener("click", () => {
    container.classList.toggle("sidebar-collapsed");
    
    // In mobile view, toggle sidebar-open instead of sidebar-collapsed
    if (window.innerWidth <= 768) {
      container.classList.toggle("sidebar-open");
    }

    // Save state to local storage
    const isCollapsed = container.classList.contains("sidebar-collapsed");
    localStorage.setItem("pkm-sidebar-collapsed", isCollapsed);
  });

  // Restore saved state from local storage (desktop only)
  if (window.innerWidth > 768) {
    const wasCollapsed = localStorage.getItem("pkm-sidebar-collapsed") === "true";
    if (wasCollapsed) {
      container.classList.add("sidebar-collapsed");
    }
  }
}

/**
 * Automatically builds the Table of Contents sidebar and highlights the active heading on scroll.
 */
function initTableOfContents() {
  const contentBody = document.querySelector(".content-body");
  const tocList = document.querySelector(".toc-list");
  
  if (!contentBody || !tocList) return;

  // Find all h2 and h3 elements within the article body
  const headings = contentBody.querySelectorAll("h2, h3");
  
  if (headings.length === 0) {
    const tocContainer = document.querySelector(".toc-container");
    if (tocContainer) tocContainer.style.display = "none";
    return;
  }

  // Clear any placeholder links
  tocList.innerHTML = "";

  const headingObserverOptions = {
    root: null,
    rootMargin: "-80px 0px -60% 0px", // triggers when heading is roughly near the top
    threshold: 0
  };

  const activeLinks = new Map();

  // Generate Table of Contents links
  headings.forEach((heading, idx) => {
    // Ensure every heading has a unique ID
    if (!heading.id) {
      heading.id = heading.textContent
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
      
      // Handle duplicates
      if (document.getElementById(heading.id) !== heading) {
        heading.id = `${heading.id}-${idx}`;
      }
    }

    const li = document.createElement("li");
    li.className = `toc-item toc-item-${heading.tagName.toLowerCase()}`;
    
    const a = document.createElement("a");
    a.href = `#${heading.id}`;
    a.className = "toc-link";
    a.textContent = heading.textContent;
    
    li.appendChild(a);
    tocList.appendChild(li);

    activeLinks.set(heading, a);
  });

  // Highlight ToC items on scroll
  const observer = new IntersectionObserver((entries) => {
    // Find the first intersecting entry
    const visibleHeading = entries.find(entry => entry.isIntersecting);
    
    if (visibleHeading) {
      // Remove active class from all links
      tocList.querySelectorAll(".toc-link").forEach(link => link.classList.remove("active"));
      
      // Add active class to corresponding link
      const activeLink = activeLinks.get(visibleHeading.target);
      if (activeLink) {
        activeLink.classList.add("active");
      }
    }
  }, headingObserverOptions);

  headings.forEach(heading => observer.observe(heading));
}

/**
 * Initializes interest-triggered tooltips by dynamically applying CSS Anchor names.
 * This satisfies the oddbird anchor positioning polyfill constraints.
 */
function initHoverPreviews() {
  const triggers = document.querySelectorAll("[interestfor]");
  if (triggers.length === 0) return;

  // Create a dynamic style element for the page's anchor bindings
  const styleEl = document.createElement("style");
  let styleRules = "";

  triggers.forEach((trigger, index) => {
    const popoverId = trigger.getAttribute("interestfor");
    const popoverTarget = document.getElementById(popoverId);

    if (popoverTarget) {
      const anchorName = `--preview-anchor-${index}`;
      
      // Inject standard anchor binding properties into dynamic CSS rules
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
  
  // Trigger polyfill stylesheet processing again if it has loaded
  if (window.CSSAnchorPositioning) {
    // Force recalculating styles
    window.CSSAnchorPositioning.processSheets();
  }
}
