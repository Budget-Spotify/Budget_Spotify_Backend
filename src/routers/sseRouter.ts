import express from 'express';
import {Comments} from "../models/schemas/Comments";
import {Users} from "../models/schemas/Users";
import {Notifies} from "../models/schemas/Notify";
import {Songs} from "../models/schemas/Songs";
import {Playlists} from "../models/schemas/Playlists";

let clients = [];
let allClient = [];

const sseRouter = express.Router();

sseRouter.get('/comment-on-song/:songId', async (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const clientId = req.params.songId;
    const newClient = {
        id: clientId,
        res,
    };
    clients.push(newClient)

    const commentStream = Comments.watch();

    commentStream.on('change', async (change) => {
        const eventData = {
            operationType: change.operationType,
            documentKey: change.documentKey,
            updatedFields: change.updateDescription?.updatedFields || null
        };
        const commentId = eventData.documentKey._id;
        const comment = await Comments.findById(commentId);
        const songId = comment.song['_id'];

        const relatedComments = await Comments.find({song: songId})
            .populate({path: 'user', model: Users});
        clients.forEach(client => {
            if (client.id === songId.toString()) {
                client.res.write(`data: ${JSON.stringify({eventData, relatedComments, songId})}\n\n`)
            }
        })
    });

    req.on('close', () => {
        commentStream.close()
        clients = clients.filter(client => client.id !== clientId);
    });
});

sseRouter.get('/comment-on-playlist/:playlistId', async (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    let playlistId = req.params.playlistId
    let relatedComments = await Comments.find({playlist: playlistId})
        .populate({path: 'user', model: Users});
    res.write(`data: ${JSON.stringify({relatedComments, playlistId})}\n\n`);
    const commentStream = Comments.watch();

    commentStream.on('change', async (change) => {
        const eventData = {
            operationType: change.operationType,
            documentKey: change.documentKey,
            updatedFields: change.updateDescription?.updatedFields || null
        };
        relatedComments = await Comments.find({playlist: playlistId})
            .populate({path: 'user', model: Users});
        res.write(`data: ${JSON.stringify({eventData, relatedComments, playlistId})}\n\n`);
    });

    req.on('close', () => {
        commentStream.close();
    });
});

sseRouter.get('/notifyInNavbar/:userId', async (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const clientId = req.params.userId;
    const newClient = {
        id: clientId,
        res,
    };
    allClient.push(newClient)

    const allNotifyOfUser = await Notifies.find({})

    const notifyStream = Notifies.watch();

    notifyStream.on('change', async (change) => {
        const eventData = {
            operationType: change.operationType,
            documentKey: change.documentKey,
            updatedFields: change.updateDescription?.updatedFields || null
        };

        const notifyId = eventData.documentKey._id;
        const notify = await Notifies.findById(notifyId);
        const entityType: string = notify.entityType;

        const entity = entityType === "song"
            ? await Songs.findById(notify.entity)
            : await Playlists.findById(notify.entity);

        const uploader = await Users.findById(entity["uploader"]);
        const allNotify = await Notifies.find({})
        const userNeedNotify = notify.userNeedToSendNotify;

        // for (const item of allNotify) {
        //     if (item.entityType === "song") {
        //         const itemPopulate = await (await item
        //             .populate({path: "song", model: Songs}))
        //             .populate({path: "sourceUser", model: Users});
        //         const user = itemPopulate.song["uploader"];
        //         if (user["_id"].toString() === uploader["_id"].toString()) {
        //             allNotifyOfUser.push(item);
        //         }
        //     } else {
        //         const itemPopulate = await (await item
        //             .populate({path: "playlist", model: Playlists}))
        //             .populate({path: "sourceUser", model: Users});
        //         const user = itemPopulate.playlist["uploader"];
        //         if (user["_id"].toString() === uploader["_id"].toString()) {
        //             allNotifyOfUser.push(item);
        //         }
        //     }
        // }
        //
        //
        // if (notify.action === "comment") {
        //     const allCommentInEntity = await Comments.find({[entityType]: entity['_id']});
        //     const commentingUsersExceptUploader = allCommentInEntity
        //         // .filter(commentInEntity => commentInEntity.user.toString() !== uploader._id.toString())  tranh uploader nhan thong bao 2 lan
        //         .map(commentInEntity => commentInEntity.user.toString());
        //
        //     const userNeedNotify2 = Array.from(new Set(commentingUsersExceptUploader))
        //     userNeedNotify.concat(userNeedNotify2)
        // }

        // const uploaderId = uploader._id; tranh uploader nhan thong bao 2 lan
        // userNeedNotify.push(uploaderId);

        const data = `data: ${JSON.stringify({eventData, allNotifyOfUploader: allNotifyOfUser})}\n\n`;

        allClient.forEach(client => {
            if (userNeedNotify.includes(client.id)) {
                client.res.write(`${data}`);
            }
        })
    });

    req.on('close', () => {
        notifyStream.close()
        allClient = allClient.filter(client => client.id !== clientId);
    });
});


export default sseRouter;