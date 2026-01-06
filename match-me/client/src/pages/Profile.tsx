import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

interface Photo {
    id: number;
    url: string;
    is_main: boolean;
}

const Profile: React.FC = () => {
    const auth = useAuth();

    // State for form
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [bio, setBio] = useState('');
    const [location, setLocation] = useState('');
    const [gender, setGender] = useState('Prefer not to say');
    const [interests, setInterests] = useState('');
    const [avatarUrl, setAvatarUrl] = useState('');
    const [msg, setMsg] = useState('');

    // Gallery State
    const [photos, setPhotos] = useState<Photo[]>([]);
    const [uploading, setUploading] = useState(false);

    const fetchPhotos = async () => {
        try {
            const res = await axios.get('http://localhost:3000/me/photos');
            setPhotos(res.data);
        } catch (err) {
            console.error("Error fetching photos", err);
        }
    };

    useEffect(() => {
        // Fetch current profile
        const fetchProfile = async () => {
            try {
                const res = await axios.get('http://localhost:3000/me');
                const p = res.data.profile;
                if (p) {
                    setFirstName(p.first_name || '');
                    setLastName(p.last_name || '');
                    setBio(p.bio || '');
                    setLocation(p.location || '');
                    setGender(p.gender || 'Prefer not to say');
                    setAvatarUrl(p.avatar_url || '');

                    // Interests stored as JSON array string or object
                    if (Array.isArray(p.interests)) {
                        setInterests(p.interests.join(', '));
                    } else if (typeof p.interests === 'string') {
                        // try parse
                        try {
                            const parsed = JSON.parse(p.interests);
                            if (Array.isArray(parsed)) setInterests(parsed.join(', '));
                        } catch (e) {
                            setInterests(p.interests);
                        }
                    }
                }
            } catch (err) {
                console.error(err);
            }
        };
        fetchProfile();
        fetchPhotos();
    }, []);

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setUploading(true);
            const formData = new FormData();
            Array.from(e.target.files).forEach(file => {
                formData.append('photos', file);
            });

            try {
                await axios.post('http://localhost:3000/me/photos', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                await fetchPhotos(); // Refresh gallery
                setMsg('Photos uploaded!');
            } catch (err) {
                console.error(err);
                setMsg('Failed to upload photos.');
            } finally {
                setUploading(false);
            }
        }
    };

    const handleSetMain = async (photoId: number) => {
        try {
            const res = await axios.put(`http://localhost:3000/me/photos/${photoId}/main`);
            setAvatarUrl(res.data.avatar_url); // Update local form state
            await fetchPhotos(); // Refresh list to show new main
            if (auth && auth.refreshUser) await auth.refreshUser(); // Update navbar
            setMsg('Main photo updated!');
        } catch (err) {
            console.error(err);
            setMsg('Failed to set main photo.');
        }
    };

    const handleDeletePhoto = async (photoId: number) => {
        if (!confirm("Are you sure?")) return;
        try {
            await axios.delete(`http://localhost:3000/me/photos/${photoId}`);
            await fetchPhotos();
        } catch (err) {
            console.error(err);
            setMsg('Failed to delete photo.');
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const formData = new FormData();
            formData.append('first_name', firstName);
            formData.append('last_name', lastName);
            formData.append('bio', bio);
            formData.append('location', location);
            formData.append('gender', gender);

            // Backend expects JSON string for interests if array logic is preserved
            const interestsArray = interests.split(',').map(s => s.trim()).filter(s => s.length > 0);
            formData.append('interests', JSON.stringify(interestsArray));

            // Note: We are NO LONGER sending 'avatar' file here. 
            // Users should use the Gallery to set their avatar.

            const res = await axios.put('http://localhost:3000/me/profile', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });

            if (res.data.avatar_url) {
                setAvatarUrl(res.data.avatar_url);
            }

            setMsg('Profile updated successfully!');

            // Update Navbar Avatar immediately if changed (though handleSetMain handles avatar change usually)
            if (auth && auth.refreshUser) {
                await auth.refreshUser();
            }

        } catch (err) {
            console.error(err);
            setMsg('Failed to update profile.');
        }
    };

    return (
        <div className="card" style={{ maxWidth: '600px', margin: '0 auto' }}>
            <h2>Edit Profile</h2>
            {msg && <div style={{ marginBottom: '10px', color: 'green' }}>{msg}</div>}

            <form onSubmit={handleSave} className="flex-col">
                <div className="flex-row">
                    <input type="text" placeholder="First Name" value={firstName} onChange={e => setFirstName(e.target.value)} required />
                    <input type="text" placeholder="Last Name" value={lastName} onChange={e => setLastName(e.target.value)} required />
                </div>

                <textarea placeholder="Bio (Tell us about yourself)" value={bio} onChange={e => setBio(e.target.value)} rows={4} required />

                <input type="text" placeholder="Location (City)" value={location} onChange={e => setLocation(e.target.value)} required />

                <select value={gender} onChange={e => setGender(e.target.value)}>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Non-binary">Non-binary</option>
                    <option value="Prefer not to say">Prefer not to say</option>
                </select>

                <input type="text" placeholder="Interests (comma separated, e.g. Hiking, coding)" value={interests} onChange={e => setInterests(e.target.value)} required />

                {/* Current Avatar Display */}
                <div style={{ margin: '10px 0', textAlign: 'center' }}>
                    <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '5px' }}>Current Profile Photo</label>
                    {avatarUrl ? (
                        <img src={avatarUrl} alt="Current" className="avatar" style={{ width: '100px', height: '100px', objectFit: 'cover', borderRadius: '50%', border: '2px solid #ddd' }} />
                    ) : (
                        <div style={{ width: '100px', height: '100px', background: '#eee', borderRadius: '50%', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>No Photo</div>
                    )}
                </div>

                <button type="submit">Save Profile Details</button>
            </form>

            <hr style={{ margin: '30px 0', border: '0', borderTop: '1px solid #eee' }} />

            {/* Photo Gallery Section */}
            <div style={{ width: '100%' }}>
                <h3 style={{ marginBottom: '15px' }}>Photo Gallery</h3>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '20px' }}>
                    {photos.length === 0 && <p style={{ color: '#888' }}>No photos uploaded yet.</p>}

                    {photos.map(photo => (
                        <div key={photo.id} style={{ position: 'relative', width: '120px', height: '120px', borderRadius: '8px', overflow: 'hidden', border: photo.is_main ? '3px solid #007bff' : '1px solid #ddd' }}>
                            <img
                                src={photo.url}
                                alt="User photo"
                                style={{
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'cover'
                                }}
                            />
                            {photo.is_main && (
                                <span style={{ position: 'absolute', top: 5, left: 5, background: '#007bff', color: 'white', fontSize: '10px', padding: '2px 6px', borderRadius: '4px' }}>
                                    Main
                                </span>
                            )}

                            <div className="photo-actions" style={{ position: 'absolute', bottom: 0, width: '100%', display: 'flex', justifyContent: 'space-around', background: 'rgba(0,0,0,0.6)', padding: '5px 0' }}>
                                {!photo.is_main && (
                                    <button
                                        type="button"
                                        onClick={() => handleSetMain(photo.id)}
                                        style={{ fontSize: '12px', cursor: 'pointer', border: 'none', background: 'transparent', color: '#fff', fontWeight: 'bold' }}
                                        title="Set as Main Profile Photo"
                                    >
                                        ★ Set Main
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={() => handleDeletePhoto(photo.id)}
                                    style={{ fontSize: '12px', cursor: 'pointer', border: 'none', background: 'transparent', color: '#ff6666', fontWeight: 'bold' }}
                                    title="Delete Photo"
                                >
                                    ✕
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                <div style={{ marginTop: '10px', padding: '15px', background: '#f9f9f9', borderRadius: '8px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Upload Files</label>
                    <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handlePhotoUpload}
                        disabled={uploading}
                        style={{ marginBottom: '10px' }}
                    />
                    {uploading && <div style={{ color: '#007bff' }}>Uploading...</div>}
                </div>
            </div>
        </div>
    );
};

export default Profile;
