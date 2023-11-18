const createRealtime = (io) => {

    io.on("connection", (socket) => {
      
      console.log("A user connected. ID: ", socket.id);
    
      socket.on("chat message", (msg, uid) => {
        // Broadcast the message to all connected clients.
        io.to(uid).emit("chat message", msg, uid);
      });
    
      socket.on("disconnect", () => {
        console.log("A user disconnected.");
        
      });
    });
    // console.log(io);
}

module.exports = {createRealtime}
