const createRealtime = (io) => {

    io.on("connection", (socket) => {
      console.log("A user connected.");
    
      socket.on("chat message", (msg, uid) => {
        // Broadcast the message to all connected clients.
        io.to(uid).emit("chat message", msg, uid);
      });
    
      socket.on("disconnect", () => {
        console.log("A user disconnected.");
      });
    });
}

module.exports = {createRealtime}
