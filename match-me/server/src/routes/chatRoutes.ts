import express from 'express';
import verifyToken from '../middleware/auth';
import { getChats, getMessages } from '../controllers/chatController';

const router = express.Router();

router.get('/chats', verifyToken, getChats);
router.get('/chats/:id/messages', verifyToken, getMessages);

export default router;
