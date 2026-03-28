import { Server } from "socket.io"


let connections = {}
let messages = {}
let timeOnline = {}
let userIdentities = {}

export const connectToSocket = (server) => {
    const io = new Server(server, {
        cors: {
            origin: "*",
            methods: ["GET", "POST"],
            allowedHeaders: ["*"],
            credentials: true
        }
    });


    io.on("connection", (socket) => {

        console.log("SOMETHING CONNECTED")

        socket.on("join-call", (path, username) => {

            if (connections[path] === undefined) {
                connections[path] = []
            }
            connections[path].push(socket.id)
            
            // Store the user identity securely mapped to their socket ID
            userIdentities[socket.id] = {
                name: username || "Guest",
                meetingCode: path
            };

            timeOnline[socket.id] = new Date();

            // connections[path].forEach(elem => {
            //     io.to(elem)
            // })

            const usersInRoom = connections[path].map(sid => ({
                socketId: sid,
                username: userIdentities[sid] ? userIdentities[sid].name : "Guest"
            }));

            for (let a = 0; a < connections[path].length; a++) {
                io.to(connections[path][a]).emit("user-joined", socket.id, usersInRoom)
            }

            if (messages[path] !== undefined) {
                for (let a = 0; a < messages[path].length; ++a) {
                    io.to(socket.id).emit("chat-message", messages[path][a]['data'],
                        messages[path][a]['sender'], messages[path][a]['socket-id-sender'])
                }
            }

        })

        socket.on("signal", (toId, message) => {
            io.to(toId).emit("signal", socket.id, message);
        })

        socket.on("chat-message", (data) => {

            // Get authoritative identity from backend memory instead of client payload
            const identity = userIdentities[socket.id];
            
            if (identity) {
                const matchingRoom = identity.meetingCode;
                const senderName = identity.name;

                if (messages[matchingRoom] === undefined) {
                    messages[matchingRoom] = []
                }

                messages[matchingRoom].push({ 'sender': senderName, "data": data, "socket-id-sender": socket.id })
                console.log("message", matchingRoom, ":", senderName, data)

                connections[matchingRoom].forEach((elem) => {
                    io.to(elem).emit("chat-message", data, senderName, socket.id)
                })
            }

        })

        socket.on("disconnect", () => {

            var diffTime = Math.abs(timeOnline[socket.id] - new Date())

            var key

            for (const [k, v] of JSON.parse(JSON.stringify(Object.entries(connections)))) {

                for (let a = 0; a < v.length; ++a) {
                    if (v[a] === socket.id) {
                        key = k

                        for (let a = 0; a < connections[key].length; ++a) {
                            io.to(connections[key][a]).emit('user-left', socket.id)
                        }

                        var index = connections[key].indexOf(socket.id)

                        connections[key].splice(index, 1)


                        if (connections[key].length === 0) {
                            delete connections[key]
                        }
                    }
                }

            }

            // Clean up the user identity mapping
            if (userIdentities[socket.id]) {
                delete userIdentities[socket.id];
            }

        })


    })


    return io;
}