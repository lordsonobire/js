import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import io from 'socket.io-client';
import { useAuth } from '../context/AuthContext';

// Chat List Component
export const ChatList: React.FC = () => {
    const [chats, setChats] = useState<any[]>([]);

    useEffect(() => {
        const fetchChats = async () => {
            try {
                const res = await axios.get('http://localhost:3000/chats');
                setChats(res.data);
            } catch (err) {
                console.error(err);
            }
        };
        fetchChats();

        // Setup simple socket listener for updates?
        // Real-time reordering required.
    }, []);

    return (
        <div>
            <h2>Chats</h2>
            <div className="flex-col">
                {chats.map(chat => (
                    <a key={chat.other_user_id} href={`/chats/${chat.other_user_id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                        <div className="card flex-row" style={{ cursor: 'pointer' }}>
                            <img src={chat.avatar_url} className="avatar" />
                            <div style={{ flex: 1 }}>
                                <h4>{chat.first_name} {chat.last_name}</h4>
                                <p style={{ opacity: 0.7, fontSize: '0.9em' }}>{chat.last_message}</p>
                            </div>
                            <div className="flex-col" style={{ alignItems: 'flex-end' }}>
                                <span style={{ fontSize: '0.8em' }}>{new Date(chat.last_message_time).toLocaleDateString()}</span>
                                {parseInt(chat.unread_count) > 0 && <span className="badge">{chat.unread_count}</span>}
                            </div>
                        </div>
                    </a>
                ))}
            </div>
        </div>
    );
};

// Chat Window Component
const ChatWindow: React.FC = () => {
    const { id } = useParams();
    const { user, token } = useAuth()!;
    const [messages, setMessages] = useState<any[]>([]);
    const [input, setInput] = useState('');
    const [partner, setPartner] = useState<any>(null);
    const socketRef = useRef<any>(null);
    const messagesEndRef = useRef<null | HTMLDivElement>(null);

    useEffect(() => {
        // Fetch partner details
        axios.get(`http://localhost:3000/users/${id}`).then(res => setPartner(res.data));

        // Fetch messages
        axios.get(`http://localhost:3000/chats/${id}/messages`).then(res => {
            // Reverse because API returns DESC (newest first) but we want to display chronological (oldest top, newest bottom)
            setMessages(res.data.reverse());
            scrollToBottom();
        });

        // Socket setup
        socketRef.current = io('http://localhost:3000', {
            auth: { token }
        });

        socketRef.current.on('new_message', (message: any) => {
            if ((message.sender_id === parseInt(id!) && message.receiver_id === user?.id) ||
                (message.sender_id === user?.id && message.receiver_id === parseInt(id!))) {
                setMessages(prev => [...prev, message]);
                scrollToBottom();
            }
        });

        return () => {
            socketRef.current.disconnect();
        };
    }, [id, token, user?.id]);

    const scrollToBottom = () => {
        setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 100);
    };

    const sendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim()) return;

        socketRef.current.emit('send_message', {
            receiverId: parseInt(id!),
            content: input
        });
        setInput('');

        // Optimistic update? Server echoes back 'new_message' so maybe wait for that to avoid duplication if we add it here too?
        // My server code: "socket.emit('new_message', message);" (back to sender).
        // So we don't need to append manually here, provided the echo works fast enough.
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '80vh' }}>
            <div className="card flex-row" style={{ padding: '10px', marginBottom: '0' }}>
                {partner && (
                    <>
                        <img src={partner.avatar_url} className="avatar" />
                        <h3 style={{ marginLeft: '10px' }}>{partner.name}</h3>
                    </>
                )}
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '20px', background: '#fff', border: '1px solid #eee' }}>
                {messages.map((m, i) => {
                    const isMe = m.sender_id === user?.id;
                    return (
                        <div key={i} style={{
                            display: 'flex',
                            justifyContent: isMe ? 'flex-end' : 'flex-start',
                            marginBottom: '10px'
                        }}>
                            <div style={{
                                background: isMe ? 'var(--primary-color)' : '#e0e0e0',
                                color: isMe ? 'white' : 'black',
                                padding: '10px 15px',
                                borderRadius: '15px',
                                maxWidth: '70%'
                            }}>
                                <div>{m.content}</div>
                                <div style={{ fontSize: '0.7em', opacity: 0.8, textAlign: 'right', marginTop: '5px' }}>
                                    {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                            </div>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            <form onSubmit={sendMessage} style={{ display: 'flex', marginTop: '10px' }}>
                <input
                    type="text"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    placeholder="Type a message..."
                    style={{ flex: 1, marginBottom: 0, borderTopRightRadius: 0, borderBottomRightRadius: 0 }}
                />
                <button type="submit" style={{ borderTopLeftRadius: 0, borderBottomLeftRadius: 0 }}>Send</button>
            </form>
        </div>
    );
};

export default ChatWindow;
