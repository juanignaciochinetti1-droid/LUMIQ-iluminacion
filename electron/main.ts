import { app, BrowserWindow, shell } from 'electron';
import { fork, ChildProcess } from 'child_process';
import path from 'path';
import { mkdirSync } from 'fs';

app.setName('LUMIQ Gestion');

const isDev = !app.isPackaged;
let mainWindow: BrowserWindow | null = null;
let serverChild: ChildProcess | null = null;

function getDbPath(): string {
  if (isDev) {
    const dataDir = path.join(app.getAppPath(), 'data');
    mkdirSync(dataDir, { recursive: true });
    return path.join(dataDir, 'gestion.db');
  }
  const userDataDir = app.getPath('userData');
  mkdirSync(userDataDir, { recursive: true });
  return path.join(userDataDir, 'gestion.db');
}

function startServer(): Promise<number> {
  return new Promise((resolve, reject) => {
    const serverPath = path.join(app.getAppPath(), 'dist', 'server.mjs');
    const dbPath = getDbPath();

    serverChild = fork(serverPath, [], {
      env: {
        ...process.env,
        NODE_ENV: isDev ? 'development' : 'production',
        SQLITE_DB_PATH: dbPath,
        AUTO_OPEN_BROWSER: 'false',
      },
      silent: false,
    });

    serverChild.on('message', (msg: any) => {
      if (msg?.type === 'ready') resolve(msg.port as number);
    });

    serverChild.on('error', reject);
    setTimeout(() => reject(new Error('Server timeout after 30s')), 30_000);
  });
}

async function createWindow(port: number): Promise<void> {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    title: 'LUMIQ Gestión de Producción',
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
    show: false,
  });

  mainWindow.once('ready-to-show', () => mainWindow?.show());

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  await mainWindow.loadURL(`http://localhost:${port}`);
  mainWindow.on('closed', () => { mainWindow = null; });
}

app.whenReady().then(async () => {
  try {
    const port = await startServer();
    await createWindow(port);
  } catch (err) {
    console.error('[Electron] Fallo al iniciar:', err);
    app.quit();
  }
});

app.on('window-all-closed', () => {
  serverChild?.kill();
  serverChild = null;
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => { serverChild?.kill(); });
