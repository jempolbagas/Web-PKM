#!/usr/bin/env node

/**
 * Academic PKM — Note Scaffolding & Configuration Automation Tool
 * Zero-dependency CLI to create new study materials.
 * Supports both interactive prompts and non-interactive command-line flags.
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

// ANSI Terminal Colors
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  magenta: '\x1b[35m'
};

// Path configuration
const paths = {
  config: path.join(__dirname, 'pkm-config.js'),
  template: path.join(__dirname, 'template.html')
};

// Helper to serialize configuration keeping the original formatting conventions
function serializeConfig(config) {
  const serializeWeek = (week) => {
    const parts = Object.entries(week).map(([key, val]) => {
      const k = /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key) ? key : JSON.stringify(key);
      return `${k}: ${JSON.stringify(val)}`;
    });
    return `        { ${parts.join(', ')} }`;
  };

  const serializeCourse = (course) => {
    const parts = Object.entries(course).map(([key, val]) => {
      const k = /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key) ? key : JSON.stringify(key);
      if (key === 'weeks' && Array.isArray(val)) {
        const weeksStr = val.map(serializeWeek).join(',\n');
        return `      weeks: [\n${weeksStr}\n      ]`;
      }
      return `      ${k}: ${JSON.stringify(val)}`;
    });
    return `    {\n${parts.join(',\n')}\n    }`;
  };

  const coursesStr = config.courses.map(serializeCourse).join(',\n');

  return `/**
 * Academic PKM Configuration Database
 * Central repository for all courses, weeks, and note pages.
 * Used by pkm-loader.js to build sidebars, headers, indexes, and navigation dynamically.
 */

const PKM_CONFIG = {
  siteTitle: ${JSON.stringify(config.siteTitle)},
  courses: [
${coursesStr}
  ]
};

// Export configuration for ESM or browser environment
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PKM_CONFIG;
}
`;
}

// Parse Command Line Arguments
function parseArgs() {
  const args = {};
  for (let i = 2; i < process.argv.length; i++) {
    const arg = process.argv[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const val = (process.argv[i + 1] && !process.argv[i + 1].startsWith('--'))
        ? process.argv[++i]
        : true;
      args[key] = val;
    }
  }
  return args;
}

// Print Help Screen
function printHelp() {
  console.log(`
${colors.bright}Usage:${colors.reset}
  ${colors.green}node create-material.js${colors.reset} [options]

${colors.bright}Interactive Mode:${colors.reset}
  Run without any options to start the step-by-step wizard.

${colors.bright}Non-Interactive Options:${colors.reset}
  --course <id>             Select course by ID (e.g. discrete-math)
  --week <number>           Week/Topic number (integer)
  --title <string>          Topic Title
  --difficulty <string>     Difficulty (Beginner, Intermediate, Hard)
  --reading-time <string>   Reading time (e.g. "45–60 minutes")
  --topics <string>         Topic tags separated by dots or commas
  --file <filename>         Custom output filename (default: week-[num].html)
  --new-course              Flag to indicate course creation
  --course-title <string>   Title for the new course
  --course-folder <string>  Folder name for the new course
  --course-index <string>   Index file name for the new course (default: index.html)
  --course-desc <string>    Description of the new course
  --course-study-time <str> Total study time for the new course (default: ~6h)
  --yes                     Skip confirmation prompt
  --help                    Show this help screen
`);
}

async function runInteractive(PKM_CONFIG) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  const ask = (query) => new Promise((resolve) => rl.question(query, resolve));

  try {
    console.log(`${colors.bright}Select Course:${colors.reset}`);
    PKM_CONFIG.courses.forEach((c, index) => {
      console.log(`  ${colors.cyan}${index + 1}${colors.reset}. ${c.title} (${colors.yellow}${c.id}${colors.reset})`);
    });
    console.log(`  ${colors.cyan}n${colors.reset}. ${colors.green}[Create New Course]${colors.reset}`);

    const courseChoiceInput = await ask(`\nEnter choice: `);
    const courseChoice = courseChoiceInput.trim().toLowerCase();

    let selectedCourse = null;
    let isNewCourse = false;

    if (courseChoice === 'n') {
      isNewCourse = true;
      console.log(`\n${colors.bright}${colors.green}--- Create New Course ---${colors.reset}`);
      const newCourseId = (await ask(`Enter unique Course ID (e.g. linear-algebra): `)).trim();
      if (!newCourseId || PKM_CONFIG.courses.some(c => c.id === newCourseId)) {
        throw new Error('Invalid or duplicate Course ID.');
      }
      const newCourseTitle = (await ask(`Enter Course Title (e.g. Linear Algebra): `)).trim();
      const newCourseFolder = (await ask(`Enter Folder Name (e.g. linear-algebra, leave blank for root): `)).trim();
      const newCourseIndex = (await ask(`Enter Course Index File [index.html]: `)).trim() || 'index.html';
      const newCourseDesc = (await ask(`Enter Course Description: `)).trim();
      const newCourseStudyTime = (await ask(`Enter Total Study Time estimate [~6h]: `)).trim() || '~6h';

      selectedCourse = {
        id: newCourseId,
        title: newCourseTitle,
        folder: newCourseFolder,
        indexFile: newCourseIndex,
        description: newCourseDesc,
        studyTime: newCourseStudyTime,
        weeks: []
      };
    } else {
      const courseIndex = parseInt(courseChoice, 10) - 1;
      if (isNaN(courseIndex) || courseIndex < 0 || courseIndex >= PKM_CONFIG.courses.length) {
        throw new Error('Invalid course selection.');
      }
      selectedCourse = PKM_CONFIG.courses[courseIndex];
    }

    console.log(`\nUsing Course: ${colors.bright}${colors.cyan}${selectedCourse.title}${colors.reset}`);

    // Input Material Details
    console.log(`\n${colors.bright}--- Enter Note / Week Details ---${colors.reset}`);
    
    // Suggest next week number
    const nextWeekNum = selectedCourse.weeks.length > 0
      ? Math.max(...selectedCourse.weeks.map(w => w.num)) + 1
      : 1;

    const weekNumInput = await ask(`Enter Week/Topic Number [${nextWeekNum}]: `);
    const weekNum = parseInt(weekNumInput.trim() || nextWeekNum, 10);
    if (isNaN(weekNum)) {
      throw new Error('Week number must be an integer.');
    }

    if (selectedCourse.weeks.some(w => w.num === weekNum)) {
      console.warn(`${colors.yellow}Warning: Week ${weekNum} already exists in this course configuration.${colors.reset}`);
    }

    const topicTitle = (await ask(`Enter Topic Title (e.g. Homogeneous Recurrence Relations): `)).trim();
    if (!topicTitle) {
      throw new Error('Topic title is required.');
    }

    console.log(`Select Difficulty:`);
    console.log(`  1. Beginner`);
    console.log(`  2. Intermediate`);
    console.log(`  3. Hard`);
    const difficultyInput = await ask(`Enter choice [2]: `);
    const difficultyMap = { '1': 'Beginner', '2': 'Intermediate', '3': 'Hard' };
    const difficulty = difficultyMap[difficultyInput.trim()] || 'Intermediate';

    const defaultReadingTime = '50–70 minutes';
    const readingTime = (await ask(`Enter Estimated Reading/Study Time [${defaultReadingTime}]: `)).trim() || defaultReadingTime;

    const topicsInput = (await ask(`Enter Core Topics (separated by dots/commas): `)).trim();
    const topics = topicsInput
      ? topicsInput.split(/[,·]/).map(t => t.trim()).join(' · ')
      : 'Overview · Key concepts';

    const defaultFilename = `week-${String(weekNum).padStart(2, '0')}.html`;
    const filenameInput = await ask(`Enter Note Filename [${defaultFilename}]: `);
    const filename = filenameInput.trim() || defaultFilename;

    // Summary & Confirmation
    console.log(`\n${colors.bright}${colors.yellow}Summary of changes:${colors.reset}`);
    console.log(`  ${colors.bright}Course:${colors.reset} ${selectedCourse.title} (${selectedCourse.id})`);
    console.log(`  ${colors.bright}Week/Topic Number:${colors.reset} ${weekNum}`);
    console.log(`  ${colors.bright}Topic Title:${colors.reset} ${topicTitle}`);
    console.log(`  ${colors.bright}Difficulty:${colors.reset} ${difficulty}`);
    console.log(`  ${colors.bright}Reading Time:${colors.reset} ${readingTime}`);
    console.log(`  ${colors.bright}Core Topics:${colors.reset} ${topics}`);
    console.log(`  ${colors.bright}Target File:${colors.reset} ${selectedCourse.folder ? selectedCourse.folder + '/' : ''}${filename}`);

    const confirmation = await ask(`\nDo you want to create this note and update the registry? (y/n) [y]: `);
    if (confirmation.trim().toLowerCase() === 'n') {
      console.log(`${colors.yellow}Aborted. No files were written.${colors.reset}`);
      rl.close();
      return;
    }

    rl.close();
    await createMaterial({
      PKM_CONFIG,
      selectedCourse,
      isNewCourse,
      weekNum,
      topicTitle,
      difficulty,
      readingTime,
      topics,
      filename
    });

  } catch (err) {
    console.error(`${colors.red}Error: ${err.message}${colors.reset}`);
    rl.close();
    process.exit(1);
  }
}

async function createMaterial({
  PKM_CONFIG,
  selectedCourse,
  isNewCourse,
  weekNum,
  topicTitle,
  difficulty,
  readingTime,
  topics,
  filename
}) {
  // Create course folder if it doesn't exist
  if (selectedCourse.folder) {
    const courseFolderAbs = path.join(__dirname, selectedCourse.folder);
    if (!fs.existsSync(courseFolderAbs)) {
      console.log(`Creating directory ${colors.cyan}${selectedCourse.folder}${colors.reset}...`);
      fs.mkdirSync(courseFolderAbs, { recursive: true });
    }
  }

  const relativePath = selectedCourse.folder ? '../' : '';
  const notePathAbs = path.join(__dirname, selectedCourse.folder || '', filename);
  
  if (fs.existsSync(notePathAbs)) {
    console.error(`${colors.red}Error: File already exists at ${notePathAbs}. Overwriting aborted in non-interactive mode.${colors.reset}`);
    process.exit(1);
  }

  const templateContent = fs.readFileSync(paths.template, 'utf8');
  let scaffoldedHTML = templateContent;

  // Perform replacements in note file
  scaffoldedHTML = scaffoldedHTML.replace('src="pkm-loader.js"', `src="${relativePath}pkm-loader.js"`);
  scaffoldedHTML = scaffoldedHTML.replace('href="index.html"', `href="${relativePath}index.html"`);
  scaffoldedHTML = scaffoldedHTML.replace('data-course="discrete-math"', `data-course="${selectedCourse.id}"`);
  scaffoldedHTML = scaffoldedHTML.replace('data-week="9"', `data-week="${weekNum}"`);
  scaffoldedHTML = scaffoldedHTML.replace(/\[Course Title\]/g, selectedCourse.title);
  scaffoldedHTML = scaffoldedHTML.replace(/\[Topic Title\]/g, topicTitle);

  fs.writeFileSync(notePathAbs, scaffoldedHTML, 'utf8');
  console.log(`${colors.green}✔ Created note file at:${colors.reset} ${notePathAbs}`);

  // If it is a new course, scaffold index.html for it
  if (isNewCourse) {
    const indexFilename = selectedCourse.indexFile || 'index.html';
    const indexPathAbs = path.join(__dirname, selectedCourse.folder || '', indexFilename);
    
    if (!fs.existsSync(indexPathAbs)) {
      const indexHTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${selectedCourse.title} — Course Index | Academic Life Hub</title>
  <!-- Load the PKM loader script -->
  <script src="${relativePath}pkm-loader.js" defer></script>
</head>
<body>
  <article class="content-body" data-course="${selectedCourse.id}" data-course-index>
    <!-- All course index cards and progress toggles are generated dynamically by pkm-loader.js -->
  </article>
</body>
</html>
`;
      fs.writeFileSync(indexPathAbs, indexHTML, 'utf8');
      console.log(`${colors.green}✔ Created course index at:${colors.reset} ${indexPathAbs}`);
    }
  }

  // Update configuration database
  const newWeekObj = {
    num: weekNum,
    title: topicTitle,
    file: filename,
    difficulty: difficulty,
    readingTime: readingTime,
    topics: topics
  };

  if (isNewCourse) {
    selectedCourse.weeks.push(newWeekObj);
    PKM_CONFIG.courses.push(selectedCourse);
  } else {
    // Find and update or add the week in configuration
    const existingWeekIndex = selectedCourse.weeks.findIndex(w => w.num === weekNum);
    if (existingWeekIndex > -1) {
      selectedCourse.weeks[existingWeekIndex] = newWeekObj;
      console.log(`Updating existing Week ${weekNum} entry in pkm-config.js...`);
    } else {
      selectedCourse.weeks.push(newWeekObj);
      // Sort weeks by number to keep config organized
      selectedCourse.weeks.sort((a, b) => a.num - b.num);
      console.log(`Adding new Week ${weekNum} entry to pkm-config.js...`);
    }
  }

  const updatedConfigText = serializeConfig(PKM_CONFIG);
  fs.writeFileSync(paths.config, updatedConfigText, 'utf8');
  console.log(`${colors.green}✔ Updated configuration registry at:${colors.reset} ${paths.config}`);

  console.log(`\n${colors.bright}${colors.green}🎉 Successfully scaffolded material!${colors.reset}\n`);
}

async function main() {
  const args = parseArgs();

  if (args.help) {
    printHelp();
    process.exit(0);
  }

  // Verify paths
  if (!fs.existsSync(paths.config)) {
    console.error(`${colors.red}Error: pkm-config.js not found at ${paths.config}${colors.reset}`);
    process.exit(1);
  }
  if (!fs.existsSync(paths.template)) {
    console.error(`${colors.red}Error: template.html not found at ${paths.template}${colors.reset}`);
    process.exit(1);
  }

  // Load config
  let PKM_CONFIG;
  try {
    PKM_CONFIG = require(paths.config);
  } catch (err) {
    console.error(`${colors.red}Error parsing pkm-config.js: ${err.message}${colors.reset}`);
    process.exit(1);
  }

  // Check if non-interactive mode arguments are provided
  const hasFlags = args.course || args.week || args.title;
  if (!hasFlags) {
    // Run interactive wizard
    console.log(`\n${colors.bright}${colors.magenta}🎓 Academic PKM — Material Creator${colors.reset}\n`);
    await runInteractive(PKM_CONFIG);
    return;
  }

  // Run non-interactive argument mode
  console.log(`\n${colors.bright}${colors.magenta}🎓 Academic PKM — Material Creator (Non-interactive)${colors.reset}\n`);
  
  try {
    let selectedCourse = null;
    let isNewCourse = !!args['new-course'];

    if (isNewCourse) {
      const courseId = args.course;
      if (!courseId) throw new Error('Missing --course <id> for new course creation.');
      if (PKM_CONFIG.courses.some(c => c.id === courseId)) {
        throw new Error(`Course ID "${courseId}" already exists.`);
      }
      const courseTitle = args['course-title'] || courseId;
      const courseFolder = args['course-folder'] || courseId;
      const courseIndex = args['course-index'] || 'index.html';
      const courseDesc = args['course-desc'] || '';
      const courseStudyTime = args['course-study-time'] || '~6h';

      selectedCourse = {
        id: courseId,
        title: courseTitle,
        folder: courseFolder,
        indexFile: courseIndex,
        description: courseDesc,
        studyTime: courseStudyTime,
        weeks: []
      };
    } else {
      const courseId = args.course;
      if (!courseId) throw new Error('Missing --course <id> parameter.');
      selectedCourse = PKM_CONFIG.courses.find(c => c.id === courseId);
      if (!selectedCourse) {
        throw new Error(`Course ID "${courseId}" not found in config. Pass --new-course to create.`);
      }
    }

    const weekNum = parseInt(args.week, 10);
    if (isNaN(weekNum)) throw new Error('Missing or invalid --week <number> parameter.');

    const topicTitle = args.title;
    if (!topicTitle) throw new Error('Missing --title <string> parameter.');

    const difficulty = args.difficulty || 'Intermediate';
    const readingTime = args['reading-time'] || '50–70 minutes';
    
    let topics = 'Overview · Key concepts';
    if (args.topics) {
      topics = args.topics.split(/[,·]/).map(t => t.trim()).join(' · ');
    }

    const defaultFilename = `week-${String(weekNum).padStart(2, '0')}.html`;
    const filename = args.file || defaultFilename;

    // Log configuration
    console.log(`  Course: ${selectedCourse.title} (${selectedCourse.id})`);
    console.log(`  Week: ${weekNum}`);
    console.log(`  Title: ${topicTitle}`);
    console.log(`  Difficulty: ${difficulty}`);
    console.log(`  Reading Time: ${readingTime}`);
    console.log(`  Topics: ${topics}`);
    console.log(`  File: ${selectedCourse.folder ? selectedCourse.folder + '/' : ''}${filename}`);

    if (!args.yes) {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
      const ask = (query) => new Promise((resolve) => rl.question(query, resolve));
      const confirmation = await ask(`\nDo you want to create this note? (y/n) [y]: `);
      rl.close();
      if (confirmation.trim().toLowerCase() === 'n') {
        console.log(`${colors.yellow}Aborted. No files were written.${colors.reset}`);
        return;
      }
    }

    await createMaterial({
      PKM_CONFIG,
      selectedCourse,
      isNewCourse,
      weekNum,
      topicTitle,
      difficulty,
      readingTime,
      topics,
      filename
    });

  } catch (err) {
    console.error(`${colors.red}Error: ${err.message}${colors.reset}`);
    process.exit(1);
  }
}

main().catch(err => {
  console.error(`${colors.red}Unhandled error: ${err.message}${colors.reset}`);
  process.exit(1);
});
