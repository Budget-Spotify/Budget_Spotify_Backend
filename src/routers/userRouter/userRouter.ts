import express from "express";
import userController from "../../controllers/userController/user.controller";
import { Security } from "../../security/security";


const userRouter = express.Router();

userRouter.use(Security.verifyToken);

userRouter.post('/upload/song', userController.addSong);
userRouter.get('/list/songs', userController.getSongs);
userRouter.get('/song/detail/:id', userController.getOneSong);
userRouter.get('/info', userController.getDetail);
userRouter.get('/playlist', userController.getPlayList);
userRouter.get('/playlist/:playlistId', userController.getSongInPlaylist);
userRouter.put('/editpassword', userController.editPassword);
userRouter.put('/editinfo', userController.editInfo);
userRouter.delete('/song/delete', userController.deleteSong);
userRouter.post('/playlist/create',userController.createPlaylist)
export default userRouter;
