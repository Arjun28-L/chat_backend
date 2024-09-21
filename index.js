const express = require('express');
const { Server } = require('socket.io');
const http = require('http');
const cors = require('cors');

const { addUser, removeUser, getUser, getUserInRoom } = require('./user.js');

const PORT = process.env.PORT || 5000;

const router = require('./router');
const app = express();
const server = http.createServer(app);
app.use(cors());
app.use(router);


const io = new Server(server, {
  cors: {
    origin: '*', // Allow requests from your React app
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type'],
    credentials: true
  }
});

// Handle socket connection
io.on('connection', (socket) => {
  console.log('New connection established:', socket.id);

  socket.on('join', ({ name, room }, callback) => {
    const { error, user } = addUser({ id: socket.id, name, room });

    if (error) return callback(error);

    socket.emit('message', { user: 'admin', text: `${user.name}, welcome to the room ${user.room}` });

    socket.broadcast.to(user.room).emit('message', { user: 'admin', text: `${user.name} has joined the room` });
    
    socket.join(user.room);

    io.to(user.room).emit('roomData',{room :user.room, users:getUserInRoom(user.room)})

    

    callback();
  });


 
  socket.on('sendMessage', (message, callback) => {
    const user = getUser(socket.id);

    if (user && user.room) {
      io.to(user.room).emit('message', { user: user.name, text: message });

      io.to(user.room).emit('roomData', { room: user.room, users:getUserInRoom(user.room) });
    }

    callback(); 
  });

  

  socket.on('disconnect', () => {
    const user = removeUser(socket.id);

    if (user) {
      io.to(user.room).emit('message', { user: 'admin', text: `${user.name} has left` });
      io.to(user.room).emit('roomData', { room: user.room, users: getUserInRoom(user.room) });
    }

    console.log('User disconnected:',);
  });
});




server.listen(PORT, () => {
  console.log(`Server connected on port ${PORT}`);
});
