import { execSync } from 'child_process';
import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';

const pkgPath = path.join(process.cwd(), 'package.json');

async function release() {
  console.log(chalk.cyan('\n🚀 Tonium - Release Manager\n'));

  // 1. Check git status
  const status = execSync('git status --porcelain').toString();
  if (status) {
    console.log(chalk.yellow('⚠️  You have uncommitted changes. Please commit or stash them first.'));
    process.exit(1);
  }

  // 2. Fetch last tag or commits
  const pkg = await fs.readJson(pkgPath);
  const currentVersion = pkg.version;
  console.log(`Current version: ${chalk.bold(currentVersion)}`);

  // Detect changes type from git log since last commit (roughly)
  // In a real scenario, we'd look for the last tag
  const logs = execSync('git log -n 10 --oneline').toString();
  
  let type: 'patch' | 'minor' | 'major' = 'patch';
  
  if (logs.includes('BREAKING CHANGE') || logs.includes('!')) {
    type = 'major';
  } else if (logs.includes('feat:')) {
    type = 'minor';
  }

  console.log(`Detected change type: ${chalk.bold(type.toUpperCase())}`);

  // 3. Confirm bump
  // Since we are in a non-interactive environment for this script execution but the user will run it manually,
  // we'll just execute it.
  
  try {
    console.log(`Bumping version...`);
    execSync(`npm version ${type} --no-git-tag-version`);
    
    const newPkg = await fs.readJson(pkgPath);
    const newVersion = newPkg.version;
    
    console.log(`New version: ${chalk.green.bold(newVersion)}`);

    // 4. Build
    console.log(`Building project...`);
    execSync('npm run build');

    // 5. Commit and Tag
    console.log(`Committing and Tagging...`);
    execSync(`git add .`);
    execSync(`git commit -m "chore: release v${newVersion}"`);
    execSync(`git tag v${newVersion}`);

    console.log(chalk.green('\n✅ Release prepared successfully!'));
    console.log(`\nNext steps:`);
    console.log(`  1. ${chalk.bold('git push --follow-tags')}`);
    console.log(`  2. ${chalk.bold('npm publish')}`);
    
  } catch (error: any) {
    console.error(chalk.red('\n❌ Error during release:'), error.message);
    process.exit(1);
  }
}

release();
