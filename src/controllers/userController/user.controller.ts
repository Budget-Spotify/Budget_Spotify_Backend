import {Songs} from "../../models/schemas/Songs";
import {Users} from "../../models/schemas/Users";
import {Playlists} from "../../models/schemas/Playlists";
import bcrypt from "bcrypt";

class UserController {
    static async addSong(req: any, res: any) {
        try {
            let {
                songName,
                description,
                fileURL,
                avatar,
                singers,
                composers,
                tags,
                uploader,
                isPublic
            }
                = req.body;
            let existingSong = await Songs.find({songName, uploader})
            if (existingSong.length > 0) {
                res.status(409).json({status: "failed", message: "Song already existed"})
            } else {
                let song = new Songs(req.body)
                await song.save()
                res.status(200).json({status: "succeeded", message: "Song added", song: song})
            }
        } catch (e) {
            res.status(404).json({status: "failed", message: e.message})
        }
    }

    static async deleteSong(req: any, res: any) {
        try {
            const song = await Songs.findOne({_id: req.body._id});
            const userId = req.user.id;
            if (!song) {
                const data = {
                    status: "failed",
                    message: 'Song does not exist!',
                }
                return res.status(404).json(data);
            }
            const uploaderId = song.uploader.toString();
            if (userId !== uploaderId) {
                const data = {
                    status: "failed",
                    message: 'This song does not belong to you!',
                }
                return res.status(403).json(data);
            }
            await Songs.deleteOne({_id: song._id});
            return res.status(200).json({
                status: "succeeded",
                message: 'The song has been deleted!'
            })
        } catch (err) {
            res.status(404).json({status: "failed", message: err.message});
        }
    }

    static async getSongs(req: any, res: any) {
        try {
            const userId = req.user.id;
            let songs = await Songs.find({uploader: userId}).sort({uploadTime: -1});
            if (songs.length > 0) {
                res.status(200).json({
                    status: 'succeeded',
                    songs: songs,
                });
            } else {
                res.status(200).json({
                    status: 'succeeded',
                    songs: [],
                    message: 'No data',
                });
            }
        } catch (err) {
            res.status(404).json({status: "failed", message: err.message});
        }
    }

    static async getDetail(req: any, res: any) {
        try {
            let user = await Users.findOne({_id: req.body.id})
            if (!user) {
                res.status(404).json({
                    status: "failed",
                    message: "User does not Exist"
                })
            } else {
                res.status(200).json({
                    status: "succeeded",
                    user: user
                })
            }
        } catch (err) {
            res.status(404).json({status: "failed", message: err.message});
        }
    }

    static async editPassword(req: any, res: any) {
        try {
            const user = await Users.findOne({_id: req.body.id});
            const {oldpassword, newpassword, newpasswordconfirm} = req.body;
            if (!user) {
                const data = {
                    status: "failed",
                    message: 'User does not exist!'
                }
                return res.json(data);
            }
            const isPasswordValid = await bcrypt.compare(oldpassword, user.password);
            if (!isPasswordValid) {
                const data = {
                    status: "failed",
                    message: 'Incorrect password!'
                }
                return res.json(data);
            }
            if (newpassword !== newpasswordconfirm) {
                const data = {
                    status: "failed",
                    message: "Incorrect password confirm!"
                }
                return res.json(data)
            }
            const saltRounds = 10;
            user.password = await bcrypt.hash(newpassword, saltRounds)
            await user.save()
            res.status(200).json({
                status: "succeeded",
                newPassword: user.password
            })
        } catch (err) {
            res.status(404).json({status: "failed", message: err.message});
        }
    }

    static async editInfo(req: any, res: any) {
        const user = await Users.findOne({_id: req.body.id});
        const {firstName, lastName, phoneNumber, gender, avatar} = req.body;
        if (!user) {
            return res.status(404).json({
                status: "failed",
                message: 'User does not exist!'
            });
        } else {
            user.firstName = firstName
            user.lastName = lastName
            user.phoneNumber = phoneNumber
            user.gender = gender
            user.avatar = avatar
            await user.save()
            res.status(200).json({
                status: "succeeded",
                userEdited: user
            })
        }
    }

    static async getOneSong(req: any, res: any) {
        try {
            let songId = req.params.id;
            let song = await Songs.findOne({_id: songId});
            if (song) {
                res.status(200).json({
                    status: 'succeeded',
                    song: song
                })
            } else {
                res.status(404).json({
                    status: 'failed',
                    message: 'No data'
                });
            }
        } catch (err) {
            res.status(404).json({status: "failed", message: err.message});
        }
    }

    static async createPlaylist(req: any, res: any) {
        try {
            let user = await Users.findOne({_id: req.user.id})
            let playlist = await Playlists.findOne({playlistName: req.body.playlistName})
            if (!playlist) {
                const date = new Date();
                const day = date.getDate();
                const month = date.getMonth() + 1;
                const year = date.getFullYear();
                const formattedDate = `${day.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}/${year}`;
                let newPlayList = new Playlists({
                    userID: req.user.id,
                    playlistName: req.body.playlistName,
                    avatar: req.body.avatar,
                    uploadTime: formattedDate,
                    description: req.body.description,
                })
                await newPlayList.save()
                user.playlist.push(newPlayList._id)
                await user.save()
                res.status(200).json({
                    status: 'succeeded',
                    message: "add playlist succcess"
                })
            } else {
                res.status(409).json({
                    message: "The playlist has existed"
                })
            }
        } catch (err) {
            res.status(404).json({status: "failed", message: err.message});
        }
    }

    static async getPlayList(req: any, res: any) {
        try {
            const userId = req.user.id;
            const userWithPlaylist = await Users.findById(userId)
                .populate({path: 'playlist', model: Playlists});
            const playlist = userWithPlaylist.playlist;
            res.status(200).json({data: playlist});
        } catch (error) {
            res.status(404).json({message: "This user dont have any playlist"});
        }
    }

    static async getSongInPlaylist(req: any, res: any) {
        try {
            const playlistId = req.params["playlistId"];
            const playlist = await Playlists.findById(playlistId)
                .populate({path: 'songs', model: Songs});
            res.status(200).json({playlist: playlist});
        } catch (e) {
            res.status(404).json({message: "Can not find playlist"});
        }
    }

    static async searchSong(req: any, res: any) {
        try {
            const songName = req.query.songName;
            if (songName) {
                const foundSongs = await Songs.find({
                    songName: {$regex: new RegExp(songName, 'i')}
                });

                res.status(200).json(foundSongs);
            } else {
                res.status(200).json('');
            }
        } catch (e) {
            res.status(404).json({message: e})
        }
    }

    static async addSongToPlaylist(req: any, res: any) {
        try {
            const songId = req.body['songId'];
            const playlistId = req.params["playlistId"];

            const playlist = await Playlists.findById(playlistId);

            if (playlist) {
                const songExists = playlist.songs.some(existingSongId => existingSongId.toString() === songId);

                if (!songExists) {
                    playlist.songs.push(songId);
                    await playlist.save();
                }
            }

            res.status(200).json({ message: "Song added to playlist successfully" });
        } catch (e) {
            res.status(500).json({ message: "Error adding song to playlist" });
        }
    }

    static async removeSongFromPlaylist(req: any, res: any) {
        try {
            const songId = req.body['songId'];
            const playlistId = req.params["playlistId"];

            const playlist = await Playlists.findById(playlistId);

            if (playlist) {
                const updatedSongs = playlist.songs.filter(existingSongId => existingSongId.toString() !== songId);

                if (updatedSongs.length !== playlist.songs.length) {
                    playlist.songs = updatedSongs;
                    await playlist.save();
                    res.status(200).json({ message: "Song removed from playlist successfully" });
                } else {
                    res.status(404).json({ message: "Song not found in playlist" });
                }
            } else {
                res.status(404).json({ message: "Playlist not found" });
            }
        } catch (e) {
            res.status(500).json({ message: "Error removing song from playlist" });
        }
    }


}

export default UserController
