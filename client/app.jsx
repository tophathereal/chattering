'use strict';

var React = require('react');
var CryptoJS = require('crypto-js');
var moment = require('moment');
var socket = io.connect();

var UsersList = React.createClass({
  render() {
    return (
      <div className='users'>
        <h3> 참여자들 </h3>
        <ul>
          {this.props.users.map((user, i) => (
            <li key={i}>{user}</li>
          ))}
        </ul>        
      </div>
    );
  }
});

var Message = React.createClass({
  render() {
    if(this.props.room === this.props.currentRoom) {
      return (
        <div className="message">
          <strong>{this.props.user} - </strong> <span>{this.props.timestamp}: {this.props.text}</span>
        </div>
      );
    } else {
      return null;
    }
  }
});

var MessageList = React.createClass({
  render() {
    console.log(this.props.messages);
    return (
      <div className='messages'>
        <h3> {this.props.currentRoom}  채팅방 as {this.props.user}</h3>
        {this.props.messages.map((message, i) => (
          <Message
            key={i}
            user={message.user}
            text={message.text}
            room={message.room}
            timestamp={message.timestamp}
            currentRoom={this.props.currentRoom}
          />
        ))}
      </div>
    );
  }
});

var MessageForm = React.createClass({
  getInitialState() {
    return { text: '' };
  },

  handleSubmit(e) {
    e.preventDefault();
    var message = {
      user: this.props.user,
      text: this.state.text,
      room: this.props.currentRoom,
      timestamp: moment().format('YYYY-MM-DD HH:mm:ss'),
      password: this.props.password
    };
    this.props.onMessageSubmit(message);
    this.setState({ text: '' });
  },

  changeHandler(e) {
    this.setState({ text: e.target.value });
  },

  render() {
    return (
      <div className='message_form'>
        <form onSubmit={this.handleSubmit}>
          <input
            placeholder='메시지 입력'
            className='textinput'
            onChange={this.changeHandler}
            value={this.state.text}
          />
          <h3></h3>
        </form>
      </div>
    );
  }
});

var ChangeNameForm = React.createClass({
  getInitialState() {
    return { newName: '', password: '' };
  },

  handleNameChange(e) {
    this.setState({ newName: e.target.value });
  },

  handlePasswordChange(e) {
    this.setState({ password: e.target.value });
  },

  handleSubmit(e) {
    e.preventDefault();
    var newName = this.state.newName;
    var password = this.state.password;
    this.props.onChangeName(newName, password);
    this.setState({ newName: '', password: '' });
  },

  render() {
    return (
      <div className='change_name_form'>
        <h3> signup </h3>
        <form onSubmit={this.handleSubmit}>
          <input
            type="text"
            placeholder='변경할 아이디 입력'
            value={this.state.newName}
            onChange={this.handleNameChange}
          />
          <input
            type="password"
            placeholder='비밀번호 입력'
            value={this.state.password}
            onChange={this.handlePasswordChange}
          />
          <button type="submit">변경</button>
        </form>  
      </div>
    );
  }
});

var LoginForm = React.createClass({
  getInitialState() {
    return { newName: '', password: '' };
  },

  handleNameChange(e) {
    this.setState({ newName: e.target.value });
  },

  handlePasswordChange(e) {
    this.setState({ password: e.target.value });
  },

  handleSubmit(e) {
    e.preventDefault();
    var newName = this.state.newName;
    var password = this.state.password;
    this.props.onLogin(newName, password);
    this.setState({ newName: '', password: '' });
  },

  render() {
    return (
      <div className='change_name_form'>
        <h3> login </h3>
        <form onSubmit={this.handleSubmit}>
          <input
            type="text"
            placeholder='변경할 아이디 입력'
            value={this.state.newName}
            onChange={this.handleNameChange}
          />
          <input
            type="password"
            placeholder='비밀번호 입력'
            value={this.state.password}
            onChange={this.handlePasswordChange}
          />
          <button type="submit">변경</button>
        </form>  
      </div>
    );
  }
});

var Roomprint = React.createClass({
  getInitialState() {
    return { searchQuery: '' };
  },

  handleSubmit(e) {
    e.preventDefault();
    const searchQuery = this.state.searchQuery.trim();
    if (searchQuery !== '') {
      this.props.onRoomChange(searchQuery);
    }
    this.setState({ searchQuery: '' });
  },

  handleSearchChange(e) {
    this.setState({ searchQuery: e.target.value });
  },

  handleRoomClick(room) {
    this.props.onRoomChange(room); // Call the onRoomChange function when a room is clicked
  },

  render() {
    return (
      <div className="room-print">
        <form onSubmit={this.handleSubmit}>
          <div className="search-bar">
            <input
              type="text"
              placeholder="검색할 내용"
              value={this.state.searchQuery}
              onChange={this.handleSearchChange}
            />
            <button type="submit">Make Room</button>
          </div>
        </form>
        <div>
          <h3>Unique Rooms:</h3>
          <ul>
            {this.props.uniqueRooms.map((room, index) => (
              <li key={index} onClick={() => this.handleRoomClick(room)}>{room}</li>
            ))}
          </ul>
        </div>
      </div>
    );
  }
});

var ChatApp = React.createClass({
    getInitialState() {
    return {
      users: [],
      messages: [],
      text: '',
      currentRoom: 'main',
      user: '', // Add state for the user's name
      userPassword: '', // Add state for the user's password
    };
  },

  componentDidMount() {
    socket.on('init', this._initialize);
    socket.on('send:message', this._messageReceive);
    socket.on('user:join', this._userJoined);
    socket.on('user:left', this._userLeft);
    socket.on('change:name', this._userChangedName);
    socket.on('change:login', this._userChangedName);
  },

  _initialize(data) {
    var { users, name, password, room, messages } = data;
    var user = name || 'Guest'; // Initialize user as empty string if name is undefined
    var userPassword = password || ''; // Initialize userPassword as empty string if password is undefined
    this.setState({ users, user, userPassword, room, messages });
  },

  _messageReceive(message) {
    var { messages } = this.state;
    messages.push(message);
    console.log(messages);
    this.setState({ messages });
  },

  handleMessageSubmit(message) {
    var { user, userPassword, currentRoom, messages } = this.state;
    message.user = user;
    message.room = currentRoom; // Set the room property to the current room
    message.timestamp = moment().format('YYYY-MM-DD HH:mm:ss');
    message.password = userPassword;
    messages.push(message);
    this.setState({ messages });
    socket.emit('send:message', message, (result) => {
      if (!result) {
        return alert('There was an error sending your message');
      }
    });
  },

  handleChangeName(newName, newPassword) {
    const hashedPassword = CryptoJS.SHA256(newPassword).toString();
    socket.emit('change:name', { name: newName, password: hashedPassword }, (result) => {
      if (!result) {
        return alert('There was an error changing your name');
      }
      var { users } = this.state;
      var index = users.indexOf(this.state.user);
      users.splice(index, 1, newName);
      this.setState({ users, user: newName, userPassword: hashedPassword });
    });
  },

  handleLogin(newName, newPassword) {
    var hashedPassword = CryptoJS.SHA256(newPassword).toString();
    socket.emit('change:login', { name: newName, password: hashedPassword }, (result, error) => {
      if (result) {
        this.setState({ user: newName, userPassword: hashedPassword });
      } else {
        alert(error || 'There was an error logging in');
      }
    });
  },

  handleRoomChange(room) {
    this.setState({ currentRoom: room });
  },

  getUniqueRooms() {
    const { messages } = this.state;
    const uniqueRooms = [...new Set(messages.map((message) => message.room))];
    return uniqueRooms;
  },

  render() {
    var user = this.state.user;
    var screenstate = false;
    if(user.length >= 6){
      if(user.substring(0,5) == 'Guest'){
        screenstate = true;
      }
    }
    console.log(user.substring(0,5));
    console.log(screenstate);
    console.log(user.length);
    
    if(screenstate){
      return (
        <div className="website-wrapper">
          <header className="header">
            <div className="header-content">
              <div className="logo">
                <img src="INU.png" alt="INU Logo" />
              </div>
              <nav className="navigation">
                <ul>
                  <li><a href="#">Home</a></li>
                  <li><a href="#">About</a></li>
                  <li><a href="#">Services</a></li>
                  <li><a href="#">Contact</a></li>
                </ul>
              </nav>
            </div>
          </header>
          <div className="container">
            <div className="center-content">
              <ChangeNameForm
                onChangeName={this.handleChangeName}
              />
              <LoginForm
                onLogin={this.handleLogin}
              />
            </div>
          </div>
        </div>
      );
    }
    else{
      return (
        <div className="website-wrapper">
          <header className="header">
            <div className="header-content">
              <div className="logo">
                <img src="INU.png" alt="INU Logo" />
              </div>
              <nav className="navigation">
                <ul>
                  <li><a href="#">Home</a></li>
                  <li><a href="#">About</a></li>
                  <li><a href="#">Services</a></li>
                  <li><a href="#">Contact</a></li>
                </ul>
              </nav>
            </div>
          </header>
          <div className="container">
            <div className="left-sidebar">
              <Roomprint
                onRoomChange={this.handleRoomChange}
                uniqueRooms={this.getUniqueRooms()}
              />
              <ChangeNameForm
                onChangeName={this.handleChangeName}
              />
              <LoginForm
                onLogin={this.handleLogin}
              />
            </div>
            <div className="center-content">
              <div className='center'>
                <MessageList
                  user={this.state.user}
                  messages={this.state.messages}
                  currentRoom={this.state.currentRoom}
                />
                <MessageForm
                  onMessageSubmit={this.handleMessageSubmit}
                  user={this.state.user}
                  currentRoom={this.state.currentRoom}
                  password={this.state.userPassword}
                />
              </div>
            </div>
          </div>
        </div>
      );
    }
  }
});

React.render(<ChatApp/>, document.getElementById('app'));

