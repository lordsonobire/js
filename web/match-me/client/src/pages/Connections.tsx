import React, { useEffect, useState } from 'react';
import api from '../api';
import { Link } from 'react-router-dom';

// Connection interface removed as it was unused
interface UserDetail {
    id: number;
    name: string;
    avatar_url: string;
}

const Connections: React.FC = () => {
    const [connections, setConnections] = useState<UserDetail[]>([]);
    const [requests, setRequests] = useState<UserDetail[]>([]);

    useEffect(() => {
        fetchConnections();
    }, []);

    const fetchConnections = async () => {
        try {
            const res = await api.get('/connections');
            const data = await Promise.all(res.data.map(async (id: number) => {
                const u = await api.get(`/users/${id}`);
                return { ...u.data, id };
            }));
            setConnections(data);
        } catch (err) {
            console.error(err);
        }
    };

    const handleDisconnect = async (id: number) => {
        if (!confirm("Are you sure?")) return;
        try {
            await api.delete(`/connections/${id}`);
            setConnections(prev => prev.filter(c => c.id !== id));
        } catch (err) {
            alert("Failed to disconnect");
        }
    };

    // Fetch Requests
    useEffect(() => {
        const fetchRequests = async () => {
            try {
                const res = await api.get('/connections/requests');
                // Backend returns [{id, name, avatar_url}] directly
                setRequests(res.data || []);
            } catch (err) {
                console.error(err);
            }
        };
        fetchRequests();
    }, []);

    const handleRespond = async (requesterId: number, action: 'accept' | 'reject') => {
        try {
            await api.post('/connections/respond', { requesterId, action });
            setRequests(prev => prev.filter(r => r.id !== requesterId));
            if (action === 'accept') {
                // Refresh connections or move locally
                fetchConnections();
            }
        } catch (err) {
            alert("Failed to respond");
        }
    };

    return (
        <div>
            {requests.length > 0 && (
                <div style={{ marginBottom: '3rem' }}>
                    <h2>Connection Requests</h2>
                    <div className="grid">
                        {requests.map(r => (
                            <div key={r.id} className="card flex-row">
                                <img src={r.avatar_url} alt={r.name} className="avatar" />
                                <div>
                                    <h4>{r.name}</h4>
                                    <div className="flex-row">
                                        <button onClick={() => handleRespond(r.id, 'accept')} style={{ backgroundColor: 'var(--success-color)' }}>Accept</button>
                                        <button onClick={() => handleRespond(r.id, 'reject')} style={{ backgroundColor: 'var(--error-color)' }}>Decline</button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <h2>My Connections</h2>
            <div className="grid">
                {connections.map(c => (
                    <div key={c.id} className="card flex-row">
                        <img src={c.avatar_url} alt={c.name} className="avatar" />
                        <div>
                            <h4>{c.name}</h4>
                            <div className="flex-row">
                                <Link to={`/chats/${c.id}`}><button>Chat</button></Link>
                                <button onClick={() => handleDisconnect(c.id)} style={{ backgroundColor: 'var(--error-color)' }}>Disconnect</button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            {connections.length === 0 && <p>No connections yet.</p>}
        </div>
    );
};

export default Connections;
