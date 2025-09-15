import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CometChat } from '@cometchat/chat-sdk-javascript';

const Dashboard = () => {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const navigate = useNavigate();
  const token = localStorage.getItem('cometchat_token');
  const uid = localStorage.getItem('uid');
  const vendorName = localStorage.getItem('name');

  useEffect(() => {
    if (!token) return navigate('/');
    initCometChat();
  }, []);

  const initCometChat = async () => {
    try {
      // Check if already initialized and logged in
      try {
        const currentUser = await CometChat.getLoggedinUser();
        if (currentUser && typeof currentUser.getUid === 'function') {
          console.log("CometChat already initialized for user:", currentUser.getUid());
          loadCustomers();
          setupMessageListener();
          return;
        }
      } catch (e) {
        console.log("No user currently logged in, proceeding with initialization");
      }

      // Initialize CometChat
      const appSetting = new CometChat.AppSettingsBuilder()
        .subscribePresenceForAllUsers()
        .setRegion(process.env.REACT_APP_COMETCHAT_REGION)
        .build();
      
      await CometChat.init(process.env.REACT_APP_COMETCHAT_APP_ID, appSetting);
      console.log("CometChat initialized successfully");
      
      // Login to CometChat using the Auth Key (not the backend token)
      console.log("Attempting CometChat login with uid:", uid);
      const user = await CometChat.login(uid, process.env.REACT_APP_COMETCHAT_AUTH_KEY);
      console.log("CometChat login successful:", user.getUid());
      
      // Set this vendor as active for customer widget
      try {
        await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/vendor/set-active`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ uid })
        });
      } catch (fetchError) {
        console.warn("Could not set active vendor:", fetchError);
      }
      
      loadCustomers();
      setupMessageListener();
    } catch (error) {
      console.error("CometChat init failed:", error);
      
      // Handle specific error cases
      if (error.code === 'LOGIN_IN_PROGRESS') {
        console.log("Login already in progress, waiting...");
        setTimeout(async () => {
          try {
            const currentUser = await CometChat.getLoggedinUser();
            if (currentUser && typeof currentUser.getUid === 'function') {
              loadCustomers();
              setupMessageListener();
            }
          } catch (e) {
            console.error("Error getting logged in user:", e);
          }
        }, 2000);
      } else if (error.code === 'USER_ALREADY_LOGGED_IN') {
        console.log("User already logged in");
        loadCustomers();
        setupMessageListener();
      } else {
        console.error("CometChat initialization error:", error);
        alert("Chat initialization failed. Please refresh the page and try again.");
      }
    }
  };

  const loadCustomers = async () => {
    try {
      // Fetch only customers assigned to this vendor
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/vendor/${uid}/customers`);
      const data = await response.json();
      
      if (response.ok) {
        setUsers(data.customers || []);
        console.log(`Loaded ${data.customers?.length || 0} customers for vendor ${uid}`);
      } else {
        console.error('Failed to load customers:', data.error);
        setUsers([]);
      }
    } catch (error) {
      console.error("Failed to load customers:", error);
      setUsers([]);
    }
  };

  const setupMessageListener = () => {
    const listenerID = "dashboard_listener";
    CometChat.addMessageListener(
      listenerID,
      new CometChat.MessageListener({
        onTextMessageReceived: (message) => {
          if (selectedUser && message.getSender().getUid() === selectedUser.getUid()) {
            setMessages(prev => [...prev, message]);
          }
          // Refresh user list to show new conversations
          loadCustomers();
        }
      })
    );
  };

  const selectUser = async (user) => {
    setSelectedUser(user);
    loadMessages(user.getUid());
  };

  const loadMessages = async (userUID) => {
    try {
      const messagesRequest = new CometChat.MessagesRequestBuilder()
        .setUID(userUID)
        .setLimit(50)
        .build();
      const messagesList = await messagesRequest.fetchPrevious();
      setMessages(messagesList.reverse());
    } catch (error) {
      console.error("Failed to load messages:", error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedUser) return;

    try {
      const textMessage = new CometChat.TextMessage(
        selectedUser.getUid(),
        newMessage,
        CometChat.RECEIVER_TYPE.USER
      );
      const sentMessage = await CometChat.sendMessage(textMessage);
      setMessages(prev => [...prev, sentMessage]);
      setNewMessage('');
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    CometChat.logout();
    navigate('/');
  };

  return (
    <div className="container-fluid vh-100">
      <nav className="navbar navbar-dark bg-dark">
        <div className="container-fluid">
          <span className="navbar-brand">Vendor Dashboard - {vendorName}</span>
          <div>
            <a href="/dashboard/sync-vendors" className="btn btn-outline-light me-2">🔄 Sync Vendors</a>
            <button className="btn btn-outline-light" onClick={handleLogout}>Logout</button>
          </div>
        </div>
      </nav>
      <div className="row h-100">
        <div className="col-4 bg-light border-end p-3" style={{height: 'calc(100vh - 56px)', overflowY: 'auto'}}>
          <h5>Customers ({users.length})</h5>
          <div className="list-group">
            {users.map(user => (
              <button 
                key={user.getUid()} 
                className={`list-group-item list-group-item-action d-flex justify-content-between align-items-center ${
                  selectedUser && selectedUser.getUid() === user.getUid() ? 'active' : ''
                }`}
                onClick={() => selectUser(user)}
              >
                <div>
                  <div className="fw-bold">{user.getName()}</div>
                  <small className="text-muted">{user.getUid()}</small>
                </div>
                <span className={`badge ${user.getStatus() === 'online' ? 'bg-success' : 'bg-secondary'}`}>
                  {user.getStatus()}
                </span>
              </button>
            ))}
          </div>
        </div>
        <div className="col-8 d-flex flex-column" style={{height: 'calc(100vh - 56px)'}}>
          {selectedUser ? (
            <>
              <div className="border-bottom p-3 bg-white">
                <h6 className="mb-0">Chat with {selectedUser.getName()}</h6>
                <small className="text-muted">{selectedUser.getStatus()}</small>
              </div>
              <div className="flex-grow-1 p-3" style={{overflowY: 'auto', backgroundColor: '#f8f9fa'}}>
                {messages.map((message, index) => (
                  <div key={index} className={`mb-3 d-flex ${
                    message.getSender().getUid() === uid ? 'justify-content-end' : 'justify-content-start'
                  }`}>
                    <div className={`p-2 rounded max-w-75 ${
                      message.getSender().getUid() === uid 
                        ? 'bg-primary text-white' 
                        : 'bg-white border'
                    }`} style={{maxWidth: '75%'}}>
                      <div>{message.getText()}</div>
                      <small className={`d-block mt-1 ${
                        message.getSender().getUid() === uid ? 'text-light' : 'text-muted'
                      }`}>
                        {new Date(message.getSentAt() * 1000).toLocaleTimeString()}
                      </small>
                    </div>
                  </div>
                ))}
              </div>
              <div className="border-top p-3 bg-white">
                <div className="input-group">
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Type your message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  />
                  <button className="btn btn-primary" onClick={sendMessage}>
                    Send
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="d-flex align-items-center justify-content-center h-100">
              <div className="text-center text-muted">
                <h5>Select a customer to start chatting</h5>
                <p>Choose a customer from the list to view and respond to their messages</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;