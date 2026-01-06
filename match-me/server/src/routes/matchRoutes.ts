import express from 'express';
import verifyToken from '../middleware/auth';
import { getConnections, getConnectionRequests, requestConnection, respondToConnection, disconnect } from '../controllers/connectionController';
import { getRecommendations, dismissRecommendation } from '../controllers/recommendationController';

const router = express.Router();

// Connections
router.get('/connections', verifyToken, getConnections);
router.get('/connections/requests', verifyToken, getConnectionRequests);
router.post('/connections', verifyToken, requestConnection);
router.put('/connections', verifyToken, respondToConnection);
router.delete('/connections', verifyToken, disconnect);

// Recommendations
router.get('/recommendations', verifyToken, getRecommendations);
router.post('/recommendations/dismiss', verifyToken, dismissRecommendation);

export default router;
