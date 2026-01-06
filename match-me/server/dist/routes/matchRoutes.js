"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = __importDefault(require("../middleware/auth"));
const connectionController_1 = require("../controllers/connectionController");
const recommendationController_1 = require("../controllers/recommendationController");
const router = express_1.default.Router();
// Connections
router.get('/connections', auth_1.default, connectionController_1.getConnections);
router.post('/connections', auth_1.default, connectionController_1.requestConnection);
router.put('/connections', auth_1.default, connectionController_1.respondToConnection);
router.delete('/connections', auth_1.default, connectionController_1.disconnect);
// Recommendations
router.get('/recommendations', auth_1.default, recommendationController_1.getRecommendations);
exports.default = router;
