import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';

interface Photo {
    id: number;
    url: string;
    is_main: boolean;
}

interface UserDetails {
    id: number;
    name: string;
    avatar_url: string;
    bio: string;
    interests: string; // pre-formatted
    location: string;
    gender: string;
}

const UserProfile: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [user, setUser] = useState<UserDetails | null>(null);
    const [photos, setPhotos] = useState<Photo[]>([]);
    const [loading, setLoading] = useState(true);
    const [msg, setMsg] = useState('');

    useEffect(() => {
        const fetchData = async () => {
            if (!id) return;
            try {
                // Fetch basics, profile, details in parallel
                const [basicsRes, bioRes, detailsRes, photosRes] = await Promise.all([
                    axios.get(`http://localhost:3000/users/${id}`),
                    axios.get(`http://localhost:3000/users/${id}/profile`),
                    axios.get(`http://localhost:3000/users/${id}/details`),
                    axios.get(`http://localhost:3000/users/${id}/photos`)
                ]);

                // Construct full user object
                const u = {
                    id: parseInt(id),
                    name: basicsRes.data.name,
                    avatar_url: basicsRes.data.avatar_url,
                    bio: bioRes.data.bio,
                    location: detailsRes.data.location,
                    gender: detailsRes.data.gender,
                    interests: ''
                };

                // Format interests
                const interestsRaw = detailsRes.data.interests;
                if (Array.isArray(interestsRaw)) {
                    u.interests = interestsRaw.join(', ');
                } else if (typeof interestsRaw === 'string') {
                    try {
                        const parsed = JSON.parse(interestsRaw);
                        if (Array.isArray(parsed)) u.interests = parsed.join(', ');
                        else u.interests = interestsRaw;
                    } catch (e) {
                        u.interests = interestsRaw;
                    }
                }

                setUser(u);
                setPhotos(photosRes.data);
                setLoading(false);
            } catch (err) {
                console.error(err);
                setMsg("Failed to load user profile.");
                setLoading(false);
            }
        };

        fetchData();
    }, [id]);

    const handleConnect = async () => {
        if (!user) return;
        try {
            await axios.post('http://localhost:3000/connections', { targetId: user.id });
            alert("Connection request sent!");
        } catch (err) {
            alert('Failed to connect or already connected.');
        }
    };

    if (loading) return <div>Loading...</div>;
    if (!user) return <div>{msg || "User not found"}</div>;

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
            <div className="card">
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
                    <img
                        src={user.avatar_url || 'https://via.placeholder.com/100'}
                        alt={user.name}
                        style={{ width: '100px', height: '100px', borderRadius: '50%', objectFit: 'cover', marginRight: '20px' }}
                    />
                    <div>
                        <h2>{user.name}</h2>
                        <p style={{ color: '#666' }}>{user.location || 'Unknown Location'}</p>
                    </div>
                    <button onClick={handleConnect} style={{ marginLeft: 'auto', background: 'var(--success-color)' }}>
                        Connect
                    </button>
                </div>

                <div style={{ marginBottom: '20px' }}>
                    <h3>About</h3>
                    <p>{user.bio || 'No bio provided.'}</p>
                </div>

                <div style={{ marginBottom: '20px' }}>
                    <h3>Details</h3>
                    <p><strong>Gender:</strong> {user.gender}</p>
                    <p><strong>Interests:</strong> {user.interests}</p>
                </div>

                <div>
                    <h3>Photo Gallery</h3>
                    {photos.length === 0 ? (
                        <p>No photos uploaded.</p>
                    ) : (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                            {photos.map(photo => (
                                <img
                                    key={photo.id}
                                    src={photo.url}
                                    alt="User gallery"
                                    style={{
                                        width: '150px',
                                        height: '150px',
                                        objectFit: 'cover',
                                        borderRadius: '8px',
                                        border: photo.is_main ? '3px solid #007bff' : '1px solid #ddd'
                                    }}
                                    title={photo.is_main ? "Main Profile Photo" : ""}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default UserProfile;
