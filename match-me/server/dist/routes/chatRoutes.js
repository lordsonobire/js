"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = __importDefault(require("../middleware/auth"));
const chatController_1 = require("../controllers/chatController");
const router = express_1.default.Router();
router.get('/chats', auth_1.default, chatController_1.getChats);
router.get('/chats/:id/messages', auth_1.default, chatController_1.getMessages);
exports.default = router;
