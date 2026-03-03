import React, { useState, useEffect } from 'react';
import api from '../api';

const Profile: React.FC = () => {
    // ... rest of state ...
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [bio, setBio] = useState('');
    const [location, setLocation] = useState('');
    const [gender, setGender] = useState('Prefer not to say');
    const [interests, setInterests] = useState('');
    const [avatarUrl, setAvatarUrl] = useState('');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [email, setEmail] = useState('');
    const [preferredLocation, setPreferredLocation] = useState('');
    const [msg, setMsg] = useState('');

    useEffect(() => {
        // Fetch current profile
        const fetchProfile = async () => {
            try {
                const res = await api.get('/me/full');
                const p = res.data.profile;
                const u = res.data.user;
                if (u) setEmail(u.email || '');
                if (p) {
                    setFirstName(p.first_name || '');
                    setLastName(p.last_name || '');
                    setBio(p.bio || '');
                    setBio(p.bio || '');
                    setLocation(p.location || '');
                    setGender(p.gender || 'Prefer not to say');
                    setAvatarUrl(p.avatar_url || '');

                    if (p.preferences) {
                        try {
                            const prefs = typeof p.preferences === 'string' ? JSON.parse(p.preferences) : p.preferences;
                            setPreferredLocation(prefs.preferredLocation || '');
                        } catch (e) {
                            console.error("Failed to parse preferences", e);
                        }
                    }

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
    }, []);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setSelectedFile(e.target.files[0]);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const interestsArray = interests.split(',').map(s => s.trim()).filter(s => s.length > 0);

            const formData = new FormData();
            formData.append('first_name', firstName);
            formData.append('last_name', lastName);
            formData.append('bio', bio);
            formData.append('location', location);
            formData.append('gender', gender);
            formData.append('interests', JSON.stringify(interestsArray));

            // Construct preferences object
            const prefs = { preferredLocation };
            formData.append('preferences', JSON.stringify(prefs));

            if (selectedFile) {
                formData.append('file', selectedFile);
            } else {
                formData.append('avatar_url', avatarUrl);
            }

            const res = await api.put('/me', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });

            // Update local state with new avatar if returned
            if (res.data.avatar_url) {
                setAvatarUrl(res.data.avatar_url);
            }

            setMsg('Profile updated successfully!');
            // Reload page to reflect avatar in navbar? or update context?
            // Context update is ideal but reload is simpler for now.
            window.location.reload();
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
                <input type="email" value={email} readOnly disabled style={{ opacity: 0.7, cursor: 'not-allowed' }} />
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

                <div className="flex-col" style={{ gap: '5px' }}>
                    <label style={{ fontWeight: 'bold' }}>Preferred Match Location:</label>
                    <input
                        type="text"
                        placeholder="e.g. London (leave empty to use your current location)"
                        value={preferredLocation}
                        onChange={e => setPreferredLocation(e.target.value)}
                    />
                </div>

                <input type="text" placeholder="Interests (comma separated, e.g. Hiking, coding)" value={interests} onChange={e => setInterests(e.target.value)} required />

                <label className="form-label">Profile Picture:</label>
                <div className="flex-row" style={{ alignItems: 'center', gap: '10px' }}>
                    <label className="custom-file-upload">
                        <input type="file" onChange={handleFileChange} accept="image/*" />
                        Choose File
                    </label>
                    {selectedFile && <span style={{ fontSize: '0.9em' }}>{selectedFile.name}</span>}

                    {(avatarUrl || selectedFile) && (
                        <button
                            type="button"
                            onClick={() => {
                                setAvatarUrl('');
                                setSelectedFile(null);
                            }}
                            style={{
                                background: '#ececec',
                                color: '#333',
                                padding: '0.5em 1em',
                                fontSize: '0.8em',
                                borderRadius: '50px'
                            }}
                        >
                            Remove
                        </button>
                    )}
                </div>

                {avatarUrl && !selectedFile && <img src={avatarUrl} alt="Current Avatar" className="profile-page-avatar" />}

                <button type="submit">Save Profile</button>
            </form>
        </div>
    );
};

export default Profile;
