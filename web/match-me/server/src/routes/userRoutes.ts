import express from 'express';
import verifyToken from '../middleware/auth';
import { getMe, updateMyProfile, getUserById, getUserProfile, getUserBio } from '../controllers/userController';
import upload from '../middleware/upload';

const router = express.Router();

// Me endpoints
// Middlewares to shortcut /me requests to /users/:id logic
const injectMyId = (req: any, res: any, next: any) => {
    req.params.id = req.user.user_id.toString();
    next();
};

router.get('/me', verifyToken, injectMyId, getUserById);
router.get('/me/profile', verifyToken, injectMyId, getUserProfile);
router.get('/me/bio', verifyToken, injectMyId, getUserBio);
router.get('/me/full', verifyToken, getMe); // Keep old getMe under a new name if needed, or just replace it.
router.put('/me/profile', verifyToken, upload.single('avatar'), updateMyProfile);

// User endpoints
router.get('/users/:id', verifyToken, getUserById);
router.get('/users/:id/profile', verifyToken, getUserProfile);
router.get('/users/:id/bio', verifyToken, getUserBio);

export default router;
