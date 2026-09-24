# Employee Archive System

An Arabic employee archive system for storing employee data and evaluations, with search, filtering, and Excel import/export.


## Download

[Download the latest build](https://drive.google.com/file/d/1UlCastrh6NsdN6PoPpVb1Zd8PFud1o9w/view?usp=sharing)


## Quick Start

```
npm install
npm start
```

## Windows Build

```
npm run build:win
```

Output: `dist/EmployeeSystem.exe`

## Database Location

* In development mode: `database/employees.db`
* In the portable version: next to the executable file

## Adding a New Field

All fields are defined in a single file: `src/shared/fields.js`

Add a new object to the array, then:

* In development mode: the system will automatically add the column (migration)
* The field will appear in the form, table, filters, and Excel

After making changes, run:

```
npm run sync:fields
```

This updates the field definitions used by the frontend.

## Project Components

* `src/shared/fields.js` — Definition of all fields (single source of truth)
* `src/main/database.js` — SQLite connection and migrations
* `src/main/excel.js` — Excel import/export
* `src/main/ipc.js` — IPC channels
* `src/renderer/` — Frontend UI (raw HTML/CSS/JS)

## USB Notes

* Safely eject the USB drive before removing it
* Keep a backup of `employees.db`
* The application enables `synchronous=FULL` to reduce the risk of database corruption


## Download

[Download the latest build](https://drive.google.com/file/d/1UlCastrh6NsdN6PoPpVb1Zd8PFud1o9w/view?usp=sharing)
