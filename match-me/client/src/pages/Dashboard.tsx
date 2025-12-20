import React, { useEffect, useState } from 'react';
import axios from 'axios';
// import { useAuth } from '../context/AuthContext'; // Removed unused
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
            const res = await axios.get('http://localhost:3000/recommendations');
            const recIds = res.data; // [{id: 1}, {id: 2}]

            // Now fetch details for each
            const detailedRecs = await Promise.all(recIds.map(async (rec: any) => {
                const userRes = await axios.get(`http://localhost:3000/users/${rec.id}`);
                const bioRes = await axios.get(`http://localhost:3000/users/${rec.id}/profile`);
                // Combine
                return {
                    id: rec.id,
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
            await axios.post('http://localhost:3000/connections', { targetId: id });
            // Remove from list
            setRecommendations(prev => prev.filter(r => r.id !== id));
        } catch (err) {
            alert('Failed to connect');
        }
    };

    const handleDismiss = (id: number) => {
        // Just remove from UI for now. Backend doesn't support "dismiss" persistence yet per my implementation plan (TODO).
        setRecommendations(prev => prev.filter(r => r.id !== id));
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
                    <div key={rec.id} className="card">
                        <img src={rec.avatar_url} alt={rec.name} className="avatar" style={{ width: '100px', height: '100px' }} />
                        <h3>{rec.name}</h3>
                        <p>{rec.bio}</p>
                        <div className="flex-row" style={{ justifyContent: 'center', marginTop: '10px' }}>
                            <button onClick={() => handleConnect(rec.id)} style={{ backgroundColor: 'var(--success-color)' }}>Connect</button>
                            <button onClick={() => handleDismiss(rec.id)} style={{ backgroundColor: 'var(--error-color)' }}>Dismiss</button>
                        </div>
                        <Link to={`/users/${rec.id}`} style={{ display: 'block', textAlign: 'center', marginTop: '10px' }}>View Full Profile</Link>
                    </div>
                ))}
            </div>
            {recommendations.length === 0 && !error && <p>No recommendations found at the moment.</p>}
        </div>
    );
};

export default Dashboard;
