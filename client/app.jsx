import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import io from 'socket.io-client';

const socket = io.connect();

const UsersList = ({ users }) => {
  return (
    <div className='users'>
      <h3> 참여자들 </h3>
      <ul>
        {users.map((user, i) => (
          <li key={i}>{user}</li>
        ))}
      </ul>
    </div>
  );
};

const Message = ({ user, text }) => {
  return (
    <div className="message">
      <strong>{user} :</strong> 
      <span>{text}</span>    
    </div>
  );
};

const MessageList = ({ messages }) => {
  return (
    <div className='messages'>
      <h2> 채팅방 </h2>
      {messages.map((message, i) => (
        <Message key={i} user={message.user} text={message.text} />
      ))}
    </div>
  );
};

const MessageForm = ({ user, onMessageSubmit }) => {
  const [text, setText] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const message = {
      user,
      text
    };
    onMessageSubmit(message);
    setText('');
  };

  return (
    <div className='message_form'>
      <form onSubmit={handleSubmit}>
        <input
          placeholder='메시지 입력'
          className='textinput'
          onChange={(e) => setText(e.target.value)}
          value={text}
        />
        <h3></h3>
      </form>
    </div>
  );
};

const ChangeNameForm = ({ onChangeName }) => {
  const [newName, setNewName] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onChangeName(newName);
    setNewName('');
  };

  return (
    <div className='change_name_form'>
      <h3> 아이디 변경 </h3>
      <form onSubmit={handleSubmit}>
        <input
          placeholder='변경할 아이디 입력'
          onChange={(e) => setNewName(e.target.value)}
          value={newName}
        />
      </form>  
    </div>
  );
};

const ChatApp = () => {
  const [users, setUsers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [user, setUser] = useState('');

  useEffect(() => {
    socket.on('init', (data) => {
      const { users, name } = data;
      setUsers(users);
      setUser(name);
    });

    socket.on('send:message', (message) => {
      setMessages((prevMessages) => [...prevMessages, message]);
    });

    socket.on('user:join', ({ name }) => {
      setUsers((prevUsers) => [...prevUsers, name]);
    });

    socket.on('user:left', ({ name }) => {
      setUsers((prevUsers) => prevUsers.filter((user) => user !== name));
    });

    socket.on('change:name', ({ oldName, newName }) => {
      setUsers((prevUsers) => prevUsers.map((user) => (user === oldName ? newName : user)));
    });

    return () => {
      socket.off('init');
      socket.off('send:message');
      socket.off('user:join');
      socket.off('user:left');
      socket.off('change:name');
    };
  }, []);

  const handleMessageSubmit = (message) => {
    setMessages((prevMessages) => [...prevMessages, message]);
    socket.emit('send:message', message);
  };

  const handleChangeName = (newName) => {
    const oldName = user;
    socket.emit('change:name', { name: newName }, (result) => {
      if (!result) {
        return alert('There was an error changing your name');
      }
      setUsers((prevUsers) => prevUsers.map((user) => (user === oldName ? newName : user)));
      setUser(newName);
    });
  };

  return (
    <div className='center'>
      <UsersList users={users} />
      <ChangeNameForm onChangeName={handleChangeName} />
      <MessageList messages={messages} />
      <MessageForm onMessageSubmit={handleMessageSubmit} user={user} />
    </div>
  );
};

const root = ReactDOM.createRoot(document.getElementById('app'));
root.render(<ChatApp />);
