const { app, BrowserWindow, dialog } = require('electron');
const path = require('path');
const { initDatabase, closeDatabase } = require('./database');
const { registerIpcHandlers } = require('./ipc');

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1300,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: 'نظام أرشيف الموظفين',
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });
  mainWindow.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));
  mainWindow.on('closed', () => { mainWindow = null; });
}

app.whenReady().then(() => {
  try {
    initDatabase();
    registerIpcHandlers();
  } catch (err) {
    console.error('[MAIN] DB init failed:', err);
    dialog.showErrorBox('خطأ في قاعدة البيانات', `تعذّر فتح قاعدة البيانات.\n\n${err.message}`);
    app.quit();
    return;
  }
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  closeDatabase();
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => closeDatabase());
