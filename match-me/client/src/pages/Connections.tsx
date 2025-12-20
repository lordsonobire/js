import React, { useEffect, useState } from 'react';
import axios from 'axios';
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
    // Wait, spec says: "/connections: which returns a list connected profiles"
    // Does it include pending?
    // My backend implementation for GET /connections only returns ACCEPTED. 
    // I need an endpoint for pending requests. 
    // I missed that in the backend implementation of `getConnections`. 
    // "Users must be able to see a list of connection requests, where they can accept or dismiss requests."
    // I should add a query param or separate endpoint.

    // For now, I will implement the View assuming I will fix the backend or use a hack (fetch all and filter? no, security).
    // I will add a backend task to fix this.

    // Let's implement the display of *accepted* connections first which works.

    useEffect(() => {
        fetchConnections();
    }, []);

    const fetchConnections = async () => {
        try {
            const res = await axios.get('http://localhost:3000/connections');
            const data = await Promise.all(res.data.map(async (c: any) => {
                const u = await axios.get(`http://localhost:3000/users/${c.id}`);
                return { ...u.data, id: c.id };
            }));
            setConnections(data);
        } catch (err) {
            console.error(err);
        }
    };

    const handleDisconnect = async (id: number) => {
        if (!confirm("Are you sure?")) return;
        try {
            await axios.delete('http://localhost:3000/connections', { data: { targetId: id } }); // DELETE with body needs 'data' key or URL params
            setConnections(prev => prev.filter(c => c.id !== id));
        } catch (err) {
            alert("Failed to disconnect");
        }
    };

    // Fetch Requests
    useEffect(() => {
        const fetchRequests = async () => {
            try {
                const res = await axios.get('http://localhost:3000/connections/requests'); // New Endpoint
                // fetch details
                const data = await Promise.all(res.data.map(async (r: any) => {
                    const u = await axios.get(`http://localhost:3000/users/${r.id}`);
                    return { ...u.data, id: r.id };
                }));
                setRequests(data);
            } catch (err) {
                console.error(err);
            }
        };
        fetchRequests();
    }, []);

    const handleRespond = async (requesterId: number, action: 'accept' | 'reject') => {
        try {
            await axios.put('http://localhost:3000/connections', { requesterId, action });
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
