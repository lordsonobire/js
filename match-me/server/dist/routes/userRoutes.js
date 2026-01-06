"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = __importDefault(require("../middleware/auth"));
const userController_1 = require("../controllers/userController");
const router = express_1.default.Router();
// Me endpoints
router.get('/me', auth_1.default, userController_1.getMe);
router.put('/me/profile', auth_1.default, userController_1.updateMyProfile); // Using /me/profile for updates as per generic REST practice, though spec just said /me is shortcut. 
// User endpoints public/protected? Spec: "Profiles are viewable by other users, only if... recommended / connected".
// For now, let's make them protected by token at least.
// And we need middleware to check permission? 
// For now, basic implementation.
router.get('/users/:id', auth_1.default, userController_1.getUserById);
router.get('/users/:id/profile', auth_1.default, userController_1.getUserProfile);
router.get('/users/:id/bio', auth_1.default, userController_1.getUserBio);
exports.default = router;
