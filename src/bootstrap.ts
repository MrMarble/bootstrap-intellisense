import os from 'os';
import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import vscode from 'vscode';

let url = 'https://cdn.jsdelivr.net/npm/bootstrap@latest/dist/css/bootstrap.css';
let statusBarItem: vscode.StatusBarItem | null = null;

export const setStatusBarItem = (version: string) => {
  if (statusBarItem === null) {
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 1);
  }

  statusBarItem.command = 'bootstrap-intellisense.changeVersion';
  statusBarItem.text = `$(bootstrap-icon) ${version}`;
  statusBarItem.tooltip = 'Click to select Bootstrap version';

  statusBarItem.show();
};

export const getBsClasses = async () => {
  const classesCache = getCacheClasses();

  if (classesCache.length === 0) {
    const rootPath = vscode.workspace.workspaceFolders;
    if (rootPath !== undefined) {
      const bootstrapPath = path.join(
        rootPath[0].uri.fsPath,
        'node_modules',
        'bootstrap',
        'dist',
        'css',
        'bootstrap.css',
      );
      if (fs.existsSync(bootstrapPath)) {
        const packageJson = JSON.parse(
          fs.readFileSync(
            path.join(rootPath[0].uri.fsPath, 'node_modules', 'bootstrap', 'package.json'),
            'utf8',
          ),
        );
        if (packageJson.config.version_short) {
          setStatusBarItem(`Bootstrap v${packageJson.config.version_short}`);
          setBsVersion(`Bootstrap v${packageJson.config.version_short}`);
        } else {
          setBsVersion(`Bootstrap v${packageJson.version}`);
          setStatusBarItem(`Bootstrap v${packageJson.config.version}`);
        }
        const css = fs.readFileSync(bootstrapPath, 'utf8');
        return extractCssClasses(css);
      }
    }

    let version = getBsVersion();

    if (version !== 'latest') {
      version = version.replace('Bootstrap v', '');
      url = url.replace('latest', version);
    }

    const response = await fetch(url);
    const responseText = await response.text();
    const classes = extractCssClasses(responseText);

    saveCacheClasses(classes);

    return classes;
  }
  return classesCache;
};

const extractCssClasses = (css: string): string[] => {
  const classRegex = /\.(?!\d)([\w-]+)/g;
  const classes = new Set<string>();
  let match;
  while ((match = classRegex.exec(css))) {
    classes.add(match[1]);
  }
  return Array.from(classes);
};

export const getBsVersion = (): string => {
  const config = vscode.workspace.getConfiguration('bootstrapIntelliSense');
  return config.get('version') || 'Bootstrap v5.3';
};

export const setBsVersion = (version: string) => {
  const config = vscode.workspace.getConfiguration('bootstrapIntelliSense');
  config.update('version', version, true);
};

const saveCacheClasses = (classes: string[]) => {
  const cachePath = getCachePath();
  fs.writeFileSync(cachePath, JSON.stringify(classes));
};

const getCacheClasses = () => {
  const cachePath = getCachePath();
  if (fs.existsSync(cachePath)) {
    return JSON.parse(fs.readFileSync(cachePath, 'utf-8'));
  }
  return [];
};

export const clearCache = () => {
  const cachePathDir = getCacheDir();
  fs.readdir(cachePathDir, (err, files) => {
    if (err) {
      throw err;
    }
    for (const file of files) {
      fs.unlinkSync(cachePathDir + file);
    }
  });
};

const getCachePath = () => {
  const cacheDir = getCacheDir();
  const version = getBsVersion();
  return path.join(cacheDir, `bootstrap-classes-${version}.json`);
};

const getCacheDir = () => {
  let cachePath;
  if (process.platform === 'win32') {
    cachePath = path.join(os.homedir(), 'AppData', 'Local', 'bootstrap-intelliSense', 'cache');
  } else if (process.platform === 'darwin') {
    cachePath = path.join(os.homedir(), 'Library', 'Caches', 'bootstrap-intelliSense');
  } else {
    cachePath = path.join(os.homedir(), '.cache', 'bootstrap-intelliSense');
  }
  try {
    fs.mkdirSync(cachePath, { recursive: true });
  } catch (err) {

    if (typeof err === 'object' && err !== null && ('code' in err) && err.code !== 'EEXIST') {
      console.error(`Failed to create cache directory: ${err.message}`);
    }
  }
  return cachePath;
};

