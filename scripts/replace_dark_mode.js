const fs = require('fs');

function addDarkMode(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  const replacements = [
    { from: /bg-slate-50(\s|"|'|`)/g, to: 'bg-slate-50 dark:bg-slate-950$1' },
    { from: /bg-white(\s|"|'|`)/g, to: 'bg-white dark:bg-slate-900$1' },
    { from: /text-slate-800(\s|"|'|`)/g, to: 'text-slate-800 dark:text-slate-200$1' },
    { from: /text-slate-900(\s|"|'|`)/g, to: 'text-slate-900 dark:text-white$1' },
    { from: /text-slate-700(\s|"|'|`)/g, to: 'text-slate-700 dark:text-slate-300$1' },
    { from: /text-slate-600(\s|"|'|`)/g, to: 'text-slate-600 dark:text-slate-400$1' },
    { from: /text-slate-500(\s|"|'|`)/g, to: 'text-slate-500 dark:text-slate-400$1' },
    { from: /text-slate-400(\s|"|'|`)/g, to: 'text-slate-400 dark:text-slate-500$1' },
    { from: /border-slate-200(\s|"|'|`|\/)/g, to: 'border-slate-200 dark:border-slate-700$1' },
    { from: /border-slate-100(\s|"|'|`|\/)/g, to: 'border-slate-100 dark:border-slate-800$1' },
    { from: /bg-slate-100(\s|"|'|`|\/)/g, to: 'bg-slate-100 dark:bg-slate-800$1' },
    { from: /bg-slate-200(\s|"|'|`|\/)/g, to: 'bg-slate-200 dark:bg-slate-700$1' },
    { from: /divide-slate-200(\s|"|'|`|\/)/g, to: 'divide-slate-200 dark:divide-slate-700$1' },
    { from: /divide-slate-100(\s|"|'|`|\/)/g, to: 'divide-slate-100 dark:divide-slate-800$1' },
  ];

  replacements.forEach(r => {
    // We only want to replace if the dark mode variant isn't already there.
    // However, a simple replace might duplicate if run multiple times, so we'll be careful.
    content = content.replace(r.from, (match, p1) => {
       // if it already has the dark mode variant right next to it, skip
       return r.to.replace('$1', p1);
    });
  });

  // some fixes for duplicates if any
  content = content.replace(/dark:bg-slate-950 dark:bg-slate-950/g, 'dark:bg-slate-950');
  content = content.replace(/dark:bg-slate-900 dark:bg-slate-900/g, 'dark:bg-slate-900');
  content = content.replace(/dark:text-slate-200 dark:text-slate-200/g, 'dark:text-slate-200');
  content = content.replace(/dark:text-white dark:text-white/g, 'dark:text-white');
  content = content.replace(/dark:text-slate-300 dark:text-slate-300/g, 'dark:text-slate-300');
  content = content.replace(/dark:text-slate-400 dark:text-slate-400/g, 'dark:text-slate-400');
  content = content.replace(/dark:text-slate-500 dark:text-slate-500/g, 'dark:text-slate-500');
  content = content.replace(/dark:border-slate-700 dark:border-slate-700/g, 'dark:border-slate-700');
  content = content.replace(/dark:border-slate-800 dark:border-slate-800/g, 'dark:border-slate-800');
  content = content.replace(/dark:bg-slate-800 dark:bg-slate-800/g, 'dark:bg-slate-800');
  content = content.replace(/dark:bg-slate-700 dark:bg-slate-700/g, 'dark:bg-slate-700');
  content = content.replace(/dark:divide-slate-700 dark:divide-slate-700/g, 'dark:divide-slate-700');
  content = content.replace(/dark:divide-slate-800 dark:divide-slate-800/g, 'dark:divide-slate-800');

  // Also add transition-colors
  // content = content.replace(/className="([^"]+)"/g, (match, classes) => {
  //   if (!classes.includes('transition-colors')) {
  //     return `className="${classes} transition-colors"`;
  //   }
  //   return match;
  // });

  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Updated ${filePath} for dark mode.`);
}

const filesToUpdate = [
  'app/board-view.tsx',
  'app/users/users-client.tsx',
  'app/profile/profile-client.tsx',
  'app/login/page.tsx',
  'app/register/page.tsx',
];

filesToUpdate.forEach(f => {
  if (fs.existsSync(f)) {
    addDarkMode(f);
  } else {
    console.log(`File not found: ${f}`);
  }
});

