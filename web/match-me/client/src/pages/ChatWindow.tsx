import React, { useEffect, useState, useRef } from 'react';
import api from '../api';
import { useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import OnlineIndicator from '../components/OnlineIndicator';

// Chat List Component
export const ChatList: React.FC = () => {
    const [chats, setChats] = useState<any[]>([]);
    const { token } = useAuth()!;
    const { socket } = useSocket() || {};

    const fetchChats = async () => {
        try {
            const res = await api.get('/chats');
            setChats(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        fetchChats();

        if (socket) {
            socket.on('new_message', () => {
                fetchChats();
            });
            // Cleanup listener when component unmounts?
            // Socket is global, so listener might persist if not careful.
            // Better to use named handler or .off?
            // For now simple .off on cleanup of effect
            return () => {
                socket.off('new_message');
            };
        }
    }, [token, socket]);

    return (
        <div>
            <h2>Chats</h2>
            <div className="flex-col">
                {chats.length === 0 && <p>No active chats. Start matching!</p>}
                {chats.map(chat => (
                    <a key={chat.other_user_id} href={`/chats/${chat.other_user_id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                        <div className="card flex-row" style={{ cursor: 'pointer' }}>
                            <div style={{ position: 'relative' }}>
                                <img src={chat.avatar_url} className="avatar" />
                                <div style={{ position: 'absolute', bottom: '2px', right: '2px' }}>
                                    <OnlineIndicator userId={chat.other_user_id} />
                                </div>
                            </div>
                            <div style={{ flex: 1 }}>
                                <h4>{chat.first_name} {chat.last_name}</h4>
                                <p style={{ opacity: 0.7, fontSize: '0.9em' }}>{chat.last_message}</p>
                            </div>
                            <div className="flex-col" style={{ alignItems: 'flex-end' }}>
                                <span style={{ fontSize: '0.8em' }}>{new Date(chat.last_message_time).toLocaleDateString()}</span>
                                {parseInt(chat.unread_count) > 0 && (
                                    <span className="badge" style={{
                                        backgroundColor: 'var(--primary-color)',
                                        color: 'white',
                                        padding: '2px 8px',
                                        borderRadius: '10px',
                                        fontSize: '0.8em',
                                        marginTop: '5px'
                                    }}>{chat.unread_count}</span>
                                )}
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
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [isTyping, setIsTyping] = useState(false);
    const typingTimeoutRef = useRef<any>(null);
    const { socket } = useSocket() || {};
    // const socketRef = useRef<any>(null); // Use global socket
    const messagesEndRef = useRef<null | HTMLDivElement>(null);
    const scrollContainerRef = useRef<null | HTMLDivElement>(null);

    const fetchMessages = async (p: number, append: boolean = false) => {
        try {
            const res = await api.get(`/chats/${id}/messages?page=${p}`);
            const newMsgs = res.data.reverse();
            if (newMsgs.length < 20) setHasMore(false);

            if (append) {
                setMessages(prev => [...newMsgs, ...prev]);
            } else {
                setMessages(newMsgs);
                scrollToBottom();
            }
        } catch (err) {
            console.error(err);
        }
    };

    const loadMore = async () => {
        if (!hasMore || loadingMore) return;
        setLoadingMore(true);
        const nextPage = page + 1;
        await fetchMessages(nextPage, true);
        setPage(nextPage);
        setLoadingMore(false);
    };

    useEffect(() => {
        // Fetch partner details
        api.get(`/users/${id}`).then(res => setPartner(res.data));

        // Mark messages as read
        api.put(`/chats/${id}/read`);

        // Fetch initial messages
        setPage(1);
        setHasMore(true);
        fetchMessages(1);

        // Socket setup -> Use global
        if (socket) {
            const handleMsg = (message: any) => {
                if ((message.sender_id === parseInt(id!) && message.receiver_id === user?.id) ||
                    (message.sender_id === user?.id && message.receiver_id === parseInt(id!))) {
                    setMessages(prev => [...prev, message]);
                    scrollToBottom();

                    if (message.sender_id === parseInt(id!)) {
                        api.put(`/chats/${id}/read`);
                    }
                }
            };

            socket.on('new_message', handleMsg);

            // --- Typing Indicators Listeners ---
            // Update local state when partner starts/stops typing
            socket.on('typing_start', (data: any) => {
                if (data.senderId === parseInt(id!)) {
                    setIsTyping(true);
                }
            });

            socket.on('typing_stop', (data: any) => {
                if (data.senderId === parseInt(id!)) {
                    setIsTyping(false);
                }
            });

            return () => {
                socket.off('new_message', handleMsg);
                socket.off('typing_start');
                socket.off('typing_stop');
            };
        }
    }, [id, token, user?.id, socket]);

    const scrollToBottom = () => {
        setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 100);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInput(e.target.value);

        if (socket && id) {
            socket.emit('typing_start', { receiverId: parseInt(id) });

            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

            typingTimeoutRef.current = setTimeout(() => {
                socket.emit('typing_stop', { receiverId: parseInt(id) });
            }, 2000);
        }
    };

    const sendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim()) return;

        if (socket) {
            socket.emit('send_message', {
                receiverId: parseInt(id!),
                content: input
            });
            // Stop typing immediately on send
            socket.emit('typing_stop', { receiverId: parseInt(id!) });
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        }
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
                        <div style={{ position: 'relative' }}>
                            <img src={partner.avatar_url} className="avatar" />
                            <div style={{ position: 'absolute', bottom: '2px', right: '2px' }}>
                                <OnlineIndicator userId={partner.user_id || parseInt(id!)} />
                            </div>
                        </div>
                        <h3 style={{ marginLeft: '10px' }}>{partner.name}</h3>
                    </>
                )}
            </div>

            <div ref={scrollContainerRef} style={{ flex: 1, overflowY: 'auto', padding: '20px', background: '#fff', border: '1px solid #eee' }}>
                {hasMore && (
                    <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                        <button
                            onClick={loadMore}
                            disabled={loadingMore}
                            style={{ backgroundColor: '#f0f0f0', color: '#666', border: 'none', padding: '5px 15px', borderRadius: '15px', fontSize: '0.8em', cursor: 'pointer' }}
                        >
                            {loadingMore ? 'Loading...' : 'Load older messages'}
                        </button>
                    </div>
                )}
                {messages.length === 0 && <p style={{ textAlign: 'center', opacity: 0.5 }}>No messages yet. Send a greeting!</p>}
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
                {isTyping && <div style={{ fontSize: '0.8em', color: '#888', fontStyle: 'italic', paddingLeft: '20px', marginBottom: '10px' }}>{partner?.name || 'User'} is typing...</div>}
            </div>

            <form onSubmit={sendMessage} style={{ display: 'flex', marginTop: '10px' }}>
                <input
                    type="text"
                    value={input}
                    onChange={handleInputChange}
                    placeholder="Type a message..."
                    style={{ flex: 1, marginBottom: 0, borderTopRightRadius: 0, borderBottomRightRadius: 0 }}
                />
                <button type="submit" style={{ borderTopLeftRadius: 0, borderBottomLeftRadius: 0 }}>Send</button>
            </form>
        </div>
    );
};

export default ChatWindow;
