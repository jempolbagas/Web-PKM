# Academic PKM — Note Creation Guide

Welcome to your **Personal Knowledge Management (PKM)** system. This is a lightweight, zero-build, client-side, and offline-friendly 3-column academic notebook designed to maximize reading flow, active recall, and structural clarity.

This guide explains how to create new lecture notes/study materials ("materials"), format them using the custom design system, and register them in the layout configuration database.

---

## Table of Contents
1. [Quick Start (Recommended)](#quick-start-recommended)
2. [Anatomy of a Note File](#anatomy-of-a-note-file)
3. [Component Formatting Guide](#component-formatting-guide)
   - [Section Headings](#1-section-headings)
   - [Prerequisite Checklist](#2-prerequisite-checklist)
   - [Definition and Theorem Boxes](#3-definition-and-theorem-boxes)
   - [Worked Examples](#4-worked-examples)
   - [Active Recall Cards](#5-active-recall-cards)
   - [Syntax Highlighting (Code Blocks)](#6-syntax-highlighting-code-blocks)
   - [Mathematical Notation (LaTeX)](#7-mathematical-notation-latex)
   - [Hover Previews & Wiki Links](#8-hover-previews--wiki-links)
4. [Manual Configuration Registry](#manual-configuration-registry)

---

## Quick Start (Recommended)

To create a new material automatically, use the interactive CLI scaffolding tool from the root of the project:

```bash
node create-material.js
```

This helper tool will:
1. Prompt you to select an existing course or register a new one.
2. Ask for details (Week/Topic number, Title, Difficulty, Reading Time, and Key Topics).
3. Copy `template.html` to the target location, replacing all titles and metadata variables.
4. Adjust relative script/style asset paths (`../pkm-loader.js`) depending on directory depth.
5. Safely append the new week/material entry to `pkm-config.js`.

---

## Anatomy of a Note File

Every note file is a standalone, minimal HTML document. The structure relies on **declarative attributes** on the `<article>` tag, which the central `pkm-loader.js` script processes on load to wrap the page with headers, dynamic sidebar navigation, and a table of contents.

### Basic Scaffold:
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Week [Number]: [Topic Title] | [Course Title]</title>
  <!-- Relative path to the loader script -->
  <script src="../pkm-loader.js" defer></script>
</head>
<body>
  <!-- Declarative metadata details mapped to the loader -->
  <article class="content-body" data-course="discrete-math" data-week="10">
    
    <h1 id="topic-title">[Topic Title]</h1>
    
    <!-- Your content goes here... -->

  </article>
</body>
</html>
```

### Critical Metadata Attributes:
- `class="content-body"`: Identifies the root container for the parser.
- `data-course="[course-id]"`: Matches the unique course ID registered in `pkm-config.js` (e.g. `discrete-math`).
- `data-week="[number]"`: Tells the loader which week this note belongs to, which determines next/prev navigation links and reading-time estimations.
- `data-course-index`: (Used only on course landing index pages, e.g. `discrete-math/index.html`) Tells the loader to render the dashboard overview and weekly completion grid dynamically.

---

## Component Formatting Guide

The stylesheet provides pre-styled academic typesetting components. Use the following structures to keep layouts consistent:

### 1. Section Headings
Use `h2` and `h3` tags to organize your text. The table of contents (ToC) on the right side of the screen is generated **automatically** from these headings.
- Ensure headings have descriptive `id` attributes (e.g. `<h2 id="arithmetic-progressions">`) to allow smooth-scrolling anchors. If omitted, the loader auto-generates them.
- Format `h2` headings with a section number span for structured look:
  ```html
  <h2 id="arithmetic-progressions">
    <span class="section-number">3</span> Arithmetic Progressions
  </h2>
  ```

### 2. Prerequisite Checklist
Place this at the top of notes to hook background knowledge. It supports interactive checkmarks.
```html
<div class="prereq-section">
  <div class="prereq-section-title">
    <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
    Before You Begin — Prerequisite Checklist
  </div>
  <ul class="prereq-list">
    <li class="prereq-item">
      <input type="checkbox" class="prereq-check" id="prereq-1">
      <label for="prereq-1" class="prereq-text">
        <strong>Sigma notation ($\sum$)</strong> — you understand indices.
        <span class="prereq-self-test">Self-test: What is $\sum_{i=1}^{3} i$? (Answer: 6)</span>
      </label>
    </li>
  </ul>
</div>
```

### 3. Definition and Theorem Boxes
Ideal for highlighting formal concepts, rules, and mathematical proofs.
```html
<!-- Definition Box -->
<div class="definition-box">
  <div class="definition-box-label">Definition</div>
  <div class="definition-box-title">Arithmetic Progression — Finite Sum</div>
  <p>
    The sum of the first $n$ terms is:
    $$S_n = \frac{n}{2}(a_1 + a_n)$$
  </p>
</div>

<!-- Theorem Box -->
<div class="definition-box theorem-box">
  <div class="definition-box-label">Theorem</div>
  <div class="definition-box-title">Infinite Geometric Series Convergence</div>
  <p>If $|r| < 1$, the infinite series converges to $\frac{a}{1 - r}$.</p>
</div>
```

### 4. Worked Examples
Provide structured steps with numerical increments:
```html
<div class="worked-example">
  <div class="worked-example-header">
    <span class="worked-example-label">Worked Example</span>
    <span class="worked-example-title">Sum of a Sequence</span>
  </div>
  <div class="worked-example-body">
    <div class="example-step">
      <div class="example-step-num">1</div>
      <div class="example-step-content"><strong>Identify factors.</strong> $a = 2$, $d = 3$.</div>
    </div>
    <div class="common-mistake">
      <span>⚠️</span>
      <div><strong>Common mistake:</strong> Forgetting index ranges starting at 0 or 1.</div>
    </div>
  </div>
</div>
```

### 5. Active Recall Cards
Promote active recall by hiding answers in interactive dropdowns. Perfect for check-questions or homework exercises.
```html
<!-- Motivation / Small Check Questions -->
<details class="recall-card">
  <summary>
    <span class="recall-icon">?</span>
    <span class="recall-question">What does $1 + 2 + \ldots + 100$ equal?</span>
  </summary>
  <div class="recall-answer">
    <p>The sum is <strong>5050</strong> using Gauss's formula $\frac{n(n+1)}{2}$.</p>
  </div>
</details>

<!-- Formal Homework Exercises (displays as a box layout) -->
<details name="exercises" class="study-card">
  <summary><strong>Question 1:</strong> Find the sum of $2, 4, 6 \dots$ up to 20 terms.</summary>
  <div class="details-content">
    <p><strong>Solution:</strong></p>
    <p>Substitute $a=2, d=2, n=20$ into $S_n = \frac{n}{2}(2a + (n-1)d)$ to get $420$.</p>
  </div>
</details>
```

### 6. Syntax Highlighting (Code Blocks)
Wrap your code in standard `<pre><code class="language-[lang]">` tags. It will be styled automatically by Prism.js:
```html
<pre><code class="language-python">def process_data(data):
    return [x * 2 for x in data]</code></pre>
```

### 7. Mathematical Notation (LaTeX)
If your note has any dollar-signs `$`, the loader will automatically fetch KaTeX to format math:
- **Inline Math**: Wrap mathematical terms with single dollar signs, like `$...$`. Example: `$f(n) = O(N^2)$`.
- **Display Block Math**: Wrap standalone equations with double dollar signs, like `$$...$$`. Example:
  `$$S_\infty = \sum_{i=0}^{\infty} a \cdot r^i = \frac{a}{1 - r}$$`

### 8. Hover Previews & Wiki Links
Add wiki-style link connections between courses or pages. When users hover or focus on the link, an anchor-positioned popover displays meta information dynamically extracted from `pkm-config.js` without leaving the page.
```html
Review the network settings in the <a href="../(CN)_7_IPv4.html" class="wiki-link" interestfor="preview-computer-networks">Computer Networks Dashboard</a>.
```
- **Requirements**:
  - class `wiki-link`
  - `interestfor` attribute set to `preview-[course-id]` (for courses) or `preview-[course-id]-week-[num]` (for specific weeks). The loader parses these IDs and queries the configuration database to build the preview card on hover.

---

## Manual Configuration Registry

If not using the CLI tool, you must manually register notes in `pkm-config.js` to display them in sidebars and index pages:

Open `pkm-config.js` and add your week/topic object to the target course's `weeks` array:

```javascript
{
  num: 10,
  title: "Homogeneous Recurrence Relations",
  file: "week-10.html",
  difficulty: "Intermediate",
  readingTime: "50–70 minutes",
  topics: "Characteristic equation · Distinct roots · Repeated roots"
}
```

### Registry Schema:
- `num`: The order sequence number (integer).
- `title`: Topic name displayed in navigation and headers.
- `file`: Relative name of the HTML file inside the course folder.
- `difficulty`: `"Beginner"`, `"Intermediate"`, or `"Hard"`.
- `readingTime`: Estimated completion time (displayed under the main header).
- `topics`: Mid-dot (`·`) separated keywords to represent topics of the week.
