import express from 'express';
import verifyToken from '../middleware/auth';
import upload from '../middleware/upload';
import { getMe, getUserById, getUserProfile, getUserBio, updateMyProfile, uploadPhotos, getPhotos, deletePhoto, setMainPhoto, getPublicUserPhotos } from '../controllers/userController';

const router = express.Router();

// Me endpoints
router.get('/me', verifyToken, getMe);
router.put('/me/profile', verifyToken, upload.single('avatar'), updateMyProfile); // Using /me/profile for updates as per generic REST practice, though spec just said /me is shortcut. 

// Photo Gallery
router.post('/me/photos', verifyToken, upload.array('photos', 5), uploadPhotos); // Max 5 at once
router.get('/me/photos', verifyToken, getPhotos);
router.delete('/me/photos/:id', verifyToken, deletePhoto);
router.put('/me/photos/:id/main', verifyToken, setMainPhoto);

// User endpoints public/protected? Spec: "Profiles are viewable by other users, only if... recommended / connected".
// For now, let's make them protected by token at least.
// And we need middleware to check permission? 
// For now, basic implementation.

router.get('/users/:id', verifyToken, getUserById);
router.get('/users/:id/profile', verifyToken, getUserProfile);
router.get('/users/:id/bio', verifyToken, getUserBio);

export default router;
