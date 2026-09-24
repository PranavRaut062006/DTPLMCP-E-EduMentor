"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const auth_1 = __importDefault(require("./routes/auth"));
const subjects_1 = __importDefault(require("./routes/subjects"));
const units_1 = __importDefault(require("./routes/units"));
const db_1 = require("./db");
const topics_1 = __importDefault(require("./routes/topics"));
const content_1 = __importDefault(require("./routes/content"));
const generate_1 = __importDefault(require("./routes/generate"));
const classrooms_1 = __importDefault(require("./routes/classrooms"));
// Always load Backend/.env, even when the server is started from another folder.
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, '../.env') });
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3001;
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use('/api/auth', auth_1.default);
app.use('/api/classrooms', classrooms_1.default);
app.use('/api/subjects', subjects_1.default);
app.use('/api/units', units_1.default);
app.use('/api/topics', topics_1.default);
app.use('/api/content', content_1.default);
app.use('/api/generate', generate_1.default);
app.use('/api/generation', generate_1.default); // alias used by the frontend
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
});
const start = async () => {
    await (0, db_1.connectDB)();
    app.listen(PORT, () => {
        console.log(`Backend server running on http://localhost:${PORT}`);
    });
};
start();
