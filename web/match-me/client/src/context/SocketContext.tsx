import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { API_BASE_URL } from '../api';

// Mimic Socket.IO interface
export interface MockSocket {
    emit: (event: string, data: any) => void;
    on: (event: string, callback: (data: any) => void) => void;
    off: (event: string) => void;
    close: () => void;
}

interface SocketContextType {
    socket: MockSocket | null;
    onlineUsers: number[];
}

const SocketContext = createContext<SocketContextType | null>(null);

export const useSocket = () => useContext(SocketContext);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { token, user } = useAuth() || {};
    const [socket, setSocket] = useState<MockSocket | null>(null);
    const [onlineUsers, setOnlineUsers] = useState<number[]>([]);

    useEffect(() => {
        if (token && user) {
            // Convert http(s) to ws(s)
            const wsUrl = API_BASE_URL.replace(/^http/, 'ws') + '/ws?token=' + token;
            const ws = new WebSocket(wsUrl);

            const listeners: Record<string, ((data: any) => void)[]> = {};

            ws.onopen = () => {
                console.log('WS Connected');
            };

            ws.onmessage = (event) => {
                try {
                    const msg = JSON.parse(event.data);
                    // Expected format: { event: string, data: any }
                    if (msg.event && listeners[msg.event]) {
                        listeners[msg.event].forEach(cb => cb(msg.data));
                    }
                } catch (e) {
                    console.error('WS Parse Error', e);
                }
            };

            ws.onclose = () => {
                console.log('WS Disconnected');
            };

            const mockSocket: MockSocket = {
                emit: (event, data) => {
                    if (ws.readyState === WebSocket.OPEN) {
                        ws.send(JSON.stringify({ event, data }));
                    }
                },
                on: (event, callback) => {
                    if (!listeners[event]) listeners[event] = [];
                    listeners[event].push(callback);
                },
                off: (event) => {
                    delete listeners[event];
                },
                close: () => {
                    ws.close();
                }
            };

            setSocket(mockSocket);

            // Handle online users simulation if needed, or rely on server events
            // The Go backend doesn't currently emit 'user_connected' globally.
            // I'll skip implementing global user tracking for now as it's not core critical path,
            // or I can implement it in Hub later. 
            // The "Chat" status updates rely on 'get_online_users' which Go isn't sending yet.
            // I'll leave onlineUsers empty for now to avoid errors.

            return () => {
                ws.close();
            };
        } else {
            if (socket) {
                socket.close();
                setSocket(null);
            }
        }
    }, [token, user]);

    return (
        <SocketContext.Provider value={{ socket, onlineUsers }}>
            {children}
        </SocketContext.Provider>
    );
};
