import React, { useEffect, useState } from 'react';
import api from '../api';
import { Link } from 'react-router-dom';

// Recommendation interface removed

interface UserSummary {
    id: number;
    name: string;
    avatar_url: string;
    bio: string;
}

const Dashboard: React.FC = () => {
    const [recommendations, setRecommendations] = useState<UserSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchRecommendations = async () => {
        try {
            const res = await api.get('/recommendations');
            const recIds: number[] = res.data; // [1, 2, 3]

            // Now fetch details for each
            const detailedRecs = await Promise.all(recIds.map(async (id: number) => {
                const userRes = await api.get(`/users/${id}`);
                const bioRes = await api.get(`/users/${id}/profile`);
                // Combine
                return {
                    id: id,
                    name: userRes.data.name,
                    avatar_url: userRes.data.avatar_url,
                    bio: bioRes.data.bio
                };
            }));

            setRecommendations(detailedRecs);
            setLoading(false);
        } catch (err: any) {
            // Check if 400 (Profile incomplete)
            if (err.response && err.response.status === 400) {
                setError("Please complete your profile to see recommendations.");
            } else {
                setError("Failed to load recommendations.");
            }
            setLoading(false);
        }
    };

    const handleConnect = async (id: number) => {
        try {
            await api.post('/connections/request', { targetId: id });
            setRecommendations(prev => prev.filter(r => r.id !== id));
        } catch (err) {
            alert('Failed to connect');
        }
    };

    const handleDismiss = async (id: number) => {
        try {
            await api.post('/recommendations/dismiss', { targetId: id });
            setRecommendations(prev => prev.filter(r => r.id !== id));
        } catch (err) {
            setRecommendations(prev => prev.filter(r => r.id !== id));
        }
    };

    useEffect(() => {
        fetchRecommendations();
    }, []);

    if (loading) return <div>Loading...</div>;

    return (
        <div>
            <h2>Recommendations</h2>
            {error && (
                <div className="card">
                    <p>{error}</p>
                    {error.includes("complete your profile") && <Link to="/profile"><button>Go to Profile</button></Link>}
                </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '20px' }}>
                {recommendations.map(rec => (
                    <div key={rec.id} className="card dashboard-card">
                        <img src={rec.avatar_url || 'https://via.placeholder.com/150'} alt={rec.name} className="large-avatar avatar" />
                        <h3>{rec.name}</h3>
                        <p className="bio-text">{rec.bio}</p>
                        <div className="flex-row action-buttons" style={{ justifyContent: 'center' }}>
                            <button className="btn-connect" onClick={() => handleConnect(rec.id)}>
                                Connect
                            </button>
                            <button className="btn-dismiss" onClick={() => handleDismiss(rec.id)}>
                                Dismiss
                            </button>
                        </div>
                        <Link to={`/users/${rec.id}`} className="view-profile-link">View Full Profile</Link>
                    </div>
                ))}
            </div>
            {recommendations.length === 0 && !error && (
                <div className="card">
                    <p>No recommendations found in your location at the moment.</p>
                    <p style={{ fontSize: '0.9em', opacity: 0.8 }}>
                        Try checking your <strong>Location</strong> or <strong>Preferred Match Location</strong> in your <Link to="/profile">Profile</Link> to find more people.
                    </p>
                </div>
            )}
        </div>
    );
};

export default Dashboard;
