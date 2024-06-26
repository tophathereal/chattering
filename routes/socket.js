const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');

// Define the file paths
const dataDir = path.join(__dirname, 'data');
const userNamesFilePath = path.join(dataDir, 'userNames.json');
const passwordsFilePath = path.join(dataDir, 'passwords.json');
const messagesFilePath = path.join(dataDir, 'messages.json');

// Create the data directory if it doesn't exist
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir);
}

// Helper function to read data from a file
function readDataFromFile(filePath, defaultValue) {
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    // If the file doesn't exist or there's an error reading it, return the default value
    fs.writeFileSync(filePath, JSON.stringify(defaultValue, null, 2), 'utf8');
    return defaultValue;
  }
}

// Helper function to write data to a file
function writeDataToFile(filePath, data) {
  const jsonData = JSON.stringify(data, null, 2);
  fs.writeFileSync(filePath, jsonData, 'utf8');
}

// Load data from files
const userNamesData = readDataFromFile(userNamesFilePath, {});
const passwordsData = readDataFromFile(passwordsFilePath, {});
const messagesData = readDataFromFile(messagesFilePath, []);

// Keep track of which names are used so that there are no duplicates
var userNames = (function () {
  var names = userNamesData;
  var passwords = passwordsData;
  var claim = function (name, password) {
    if (!name || names[name]) {
      return false;
    } else {
      names[name] = true;
      passwords[name] = password;
      saveData();
      return true;
    }
  };
  // find the lowest unused "guest" name and claim it
  var getGuestName = function () {
    var name,
      nextUserId = 1;
    do {
      name = 'Guest' + nextUserId;
      nextUserId += 1;
    } while (!claim(name, ''));
    return name;
  };
  // serialize claimed names as an array
  var get = function () {
    var res = [];
    for (var user in names) {
      res.push(user + passwords[user]);
    }
    return res;
  };
  var free = function (name) {
    if (names[name]) {
      delete names[name];
      delete passwords[name];
      saveData();
    }
  };
  var checkCredentials = function (name, password) {
    return names[name] && passwords[name] === password;
  };
  var saveData = function () {
    writeDataToFile(userNamesFilePath, names);
    writeDataToFile(passwordsFilePath, passwords);
  };
  return {
    claim: claim,
    free: free,
    get: get,
    getGuestName: getGuestName,
    checkCredentials: checkCredentials
  };
}());

var messages = messagesData;

// export function for listening to the socket
module.exports = function (socket) {
  var name = userNames.getGuestName();
  // send the new user their name, a list of users, and the message history
  socket.emit('init', {
    name: name,
    password: '',
    users: userNames.get(),
    room: "main",
    messages: messages
  });
  // notify other clients that a new user has joined
  socket.broadcast.emit('user:join', {
    name: name
  });
  // broadcast a user's message to other users and save it to the message list
  socket.on('send:message', function (data, fn) {
    var username = data.user;
    var password = data.password;
    // Check if the username exists and if the provided password matches
    if (userNames.checkCredentials(username, password)) {
      messages.push(data);
      writeDataToFile(messagesFilePath, messages);
      socket.broadcast.emit('send:message', {
        user: name,
        text: data.text,
        room: data.room,
        timestamp: data.timestamp
      });
      fn(true);
    } else {
      // Authentication failed
      fn(false, "Invalid username or password");
    }
  });
  // validate a user's name change, and broadcast it on success
  socket.on('change:name', function (data, fn) {
    if (userNames.claim(data.name, data.password)) {
      var oldName = name;
      name = data.name;
      socket.broadcast.emit('change:name', {
        oldName: oldName,
        newName: name
      });
      fn(true);
    } else {
      fn(false);
    }
  });
  // In the server-side socket.js file
  socket.on('change:login', function (data, fn) {
    var username = data.name;
    var password = data.password;
    // Check if the username exists and if the provided password matches
    if (userNames.checkCredentials(username, password)) {
      // Authentication successful
      fn(true);
    } else {
      // Authentication failed
      fn(false, "Invalid username or password");
    }
  });
  // clean up when a user leaves, and broadcast it to other users
  socket.on('disconnect', function () {
    socket.broadcast.emit('user:left', {
      name: name
    });
    userNames.free(name);
  });
};

