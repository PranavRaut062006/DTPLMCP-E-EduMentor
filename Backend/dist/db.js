"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.writeDB = exports.readDB = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const DB_PATH = path_1.default.join(__dirname, '../data/db.json');
const defaultDb = {
    users: [],
    subjects: [],
    units: [],
    topics: [],
    content: []
};
const readDB = () => {
    if (!fs_1.default.existsSync(DB_PATH)) {
        fs_1.default.writeFileSync(DB_PATH, JSON.stringify(defaultDb, null, 2), 'utf-8');
        return defaultDb;
    }
    try {
        const data = fs_1.default.readFileSync(DB_PATH, 'utf-8');
        return JSON.parse(data);
    }
    catch (err) {
        console.error('Error reading db.json:', err);
        return defaultDb;
    }
};
exports.readDB = readDB;
const writeDB = (db) => {
    fs_1.default.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf-8');
};
exports.writeDB = writeDB;
