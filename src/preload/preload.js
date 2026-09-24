const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  list:          (query, filters) => ipcRenderer.invoke('employees:list', query, filters),
  get:           (id)             => ipcRenderer.invoke('employees:get', id),
  create:        (data)           => ipcRenderer.invoke('employees:create', data),
  update:        (id, data)       => ipcRenderer.invoke('employees:update', id, data),
  remove:        (id)             => ipcRenderer.invoke('employees:delete', id),
  distinct:      (field)          => ipcRenderer.invoke('employees:distinctValues', field),

  evalList:      (employeeId)     => ipcRenderer.invoke('evaluations:listByEmployee', employeeId),
  evalGet:       (id)             => ipcRenderer.invoke('evaluations:get', id),
  evalCreate:    (data)           => ipcRenderer.invoke('evaluations:create', data),
  evalUpdate:    (id, data)       => ipcRenderer.invoke('evaluations:update', id, data),
  evalRemove:    (id)             => ipcRenderer.invoke('evaluations:delete', id),

  excelExport:   (query, filters) => ipcRenderer.invoke('excel:export', query, filters),
  excelImport:   ()               => ipcRenderer.invoke('excel:import'),
  excelTemplate: ()               => ipcRenderer.invoke('excel:template'),

  exportEmployeePdf: (id) => ipcRenderer.invoke('export-employee-pdf', id),

  dbInfo:        ()               => ipcRenderer.invoke('db:info'),
});