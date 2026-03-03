import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import OnlineIndicator from '../components/OnlineIndicator';

interface UserDetails {
    id: number;
    name: string;
    avatar_url?: string;
    bio?: string;
    location?: string;
    gender?: string;
    interests?: string[] | string; // Handle both cases
    connection_status?: string;
}

const UserProfile: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [user, setUser] = useState<UserDetails | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchUser = async () => {
            try {
                // Fetch all data in parallel
                const [basicRes, bioRes, detailsRes] = await Promise.all([
                    api.get(`/users/${id}`),
                    api.get(`/users/${id}/profile`),
                    api.get(`/users/${id}/bio`)
                ]);

                // Combine data
                const userData: UserDetails = {
                    id: basicRes.data.id,
                    name: basicRes.data.name,
                    avatar_url: basicRes.data.avatar_url,
                    connection_status: basicRes.data.connection_status,
                    bio: bioRes.data.bio,
                    location: detailsRes.data.location,
                    gender: detailsRes.data.gender,
                    interests: detailsRes.data.interests
                };

                setUser(userData);
                setLoading(false);
            } catch (err) {
                console.error(err);
                setError('Failed to load user profile');
                setLoading(false);
            }
        };

        if (id) fetchUser();
    }, [id]);

    if (loading) return <div>Loading...</div>;
    if (error) return <div className="card">{error} <button onClick={() => navigate(-1)}>Go Back</button></div>;
    if (!user) return <div>User not found</div>;

    // Helper to format interests
    const renderInterests = () => {
        if (!user.interests) return 'None';
        if (Array.isArray(user.interests)) return user.interests.join(', ');
        // If string, try parse or just display
        try {
            const parsed = JSON.parse(user.interests);
            if (Array.isArray(parsed)) return parsed.join(', ');
            return user.interests;
        } catch {
            return user.interests;
        }
    };

    return (
        <div className="card" style={{ maxWidth: '600px', margin: '0 auto' }}>
            <button onClick={() => navigate(-1)} style={{ marginBottom: '20px', backgroundColor: '#888' }}>&larr; Back</button>

            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                {user.avatar_url ? (
                    <img src={user.avatar_url} alt={user.name} className="avatar" style={{ width: '150px', height: '150px' }} />
                ) : (
                    <div className="avatar" style={{ width: '150px', height: '150px', background: '#ccc', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                        No Image
                    </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                    <h2>{user.name}</h2>
                    <OnlineIndicator userId={user.id} showText={true} />
                </div>
            </div>

            <div className="flex-col">
                <div>
                    <strong>Bio:</strong>
                    <p>{user.bio || 'No bio available.'}</p>
                </div>

                <div className="flex-row" style={{ justifyContent: 'space-between', borderTop: '1px solid #eee', paddingTop: '10px' }}>
                    <div>
                        <strong>Location:</strong> {user.location || 'Unknown'}
                    </div>
                    <div>
                        <strong>Gender:</strong> {user.gender || 'Unknown'}
                    </div>
                </div>

                <div style={{ borderTop: '1px solid #eee', paddingTop: '10px' }}>
                    <strong>Interests:</strong>
                    <p>{renderInterests()}</p>
                </div>

                <div className="flex-row" style={{ justifyContent: 'center', marginTop: '20px' }}>
                    {user.connection_status === 'accepted' && (
                        <button
                            onClick={() => navigate(`/chats/${user.id}`)}
                            style={{ backgroundColor: 'var(--primary-color)', padding: '10px 30px' }}
                        >
                            Chat with {user.name.split(' ')[0]}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default UserProfile;
