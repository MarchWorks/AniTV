// Native
const { join } = require('path');

// Packages
const { BrowserWindow, app, Tray, dialog } = require('electron');
const isDev = require('electron-is-dev');
const prepareNext = require('electron-next');
const { autoUpdater } = require('electron-updater');

const prepareIpc = require('./ipc');
const getContextMenu = require('./context-menu');

process.on('uncaughtException', error => {
  console.error(error);

  dialog.showMessageBox({
    title: 'Unexpected Error',
    type: 'error',
    message: 'An Error Has Occurred',
    detail: error.toString(),
    buttons: ['Quit Now']
  });

  process.exit(1);
});

process.on('unhandledRejection', error => {
  console.error(error);

  dialog.showMessageBox({
    title: 'Unexpected Error',
    type: 'error',
    message: 'An Error Has Occurred',
    detail: error.toString(),
    buttons: ['Quit Now']
  });

  process.exit(1);
});

// Prepare the renderer once the app is ready
app.on('ready', async () => {
  await prepareNext('./renderer');

  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 700,
    icon: join(__dirname, 'static/icons/icon.png'),
    webPreferences: {
      nodeIntegration: true,
      webSecurity: false,
      contextIsolation: false,
      preload: join(__dirname, 'preload.js')
    }
  });

  const tray = new Tray(join(__dirname, 'static/icons/icon.png'));
  tray.setToolTip(
    `${
      app.name
    } ${app.getVersion()}\n0 downloading, 0 seeding\n0.0 kB/s down, 0.0 kB/s up`
  );

  const gotInstanceLock = app.requestSingleInstanceLock();

  if (!gotInstanceLock) {
    return app.exit();
  }

  app.on('before-quit', () => {
    mainWindow.destroy();
  });

  mainWindow.on('close', event => {
    event.preventDefault();
    mainWindow.hide();
  });

  const toggleActivity = () => {
    const isVisible = mainWindow.isVisible();
    const isWin = process.platform === 'win32';

    if (!isWin && isVisible && !mainWindow.isFocused()) {
      mainWindow.focus();
      return;
    }

    if (isVisible) {
      mainWindow.close();
    } else {
      mainWindow.show();
    }
  };

  tray.on('double-click', toggleActivity);

  let submenuShown = false;
  prepareIpc(app, mainWindow, tray);
  const menu = await getContextMenu();
  tray.on('right-click', async event => {
    if (mainWindow.isVisible()) {
      mainWindow.hide();
      return;
    }

    // Toggle submenu
    tray.popUpContextMenu(submenuShown ? null : menu);
    submenuShown = !submenuShown;

    event.preventDefault();
  });

  if (isDev) {
    mainWindow.webContents.openDevTools();
  } else {
    autoUpdater.checkForUpdatesAndNotify();
    autoUpdater.on('update-available', () => {
      mainWindow.webContents.send('update_available');
    });
    autoUpdater.on('update-downloaded', () => {
      mainWindow.webContents.send('update_downloaded');
      autoUpdater.quitAndInstall();
    });
  }

  const url = isDev
    ? 'http://localhost:8000/start'
    : `${app.getAppPath()}/renderer/out/start.html`;

  mainWindow.setMenu(null);
  mainWindow.loadURL(url);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
