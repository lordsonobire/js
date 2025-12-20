import React, { useState, useEffect } from 'react';
import axios from 'axios';
// // import { useAuth } from '../context/AuthContext';

const Profile: React.FC = () => {
    // const auth = useAuth()!; // Auth context not actually used directly in component logic, only axios interceptor uses token globally.
    // Removed unused declaration
    // user unused locally, only id from context needed? Actually useEffect calls /me which uses token.
    // user object from context might be stale or not full profile.
    // Removed unused destructuring
    // State for form
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [bio, setBio] = useState('');
    const [location, setLocation] = useState('');
    const [gender, setGender] = useState('Prefer not to say');
    const [interests, setInterests] = useState('');
    const [avatarUrl, setAvatarUrl] = useState('');
    const [msg, setMsg] = useState('');

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
    }, []);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const interestsArray = interests.split(',').map(s => s.trim()).filter(s => s.length > 0);

            await axios.put('http://localhost:3000/me/profile', {
                first_name: firstName,
                last_name: lastName,
                bio,
                location,
                gender,
                interests: interestsArray,
                avatar_url: avatarUrl
            });
            setMsg('Profile updated successfully!');
        } catch (err) {
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

                <input type="text" placeholder="Avatar URL (start with http...)" value={avatarUrl} onChange={e => setAvatarUrl(e.target.value)} />
                {/* Image upload optional bonus or implemented as URL for simplicity now */}

                {avatarUrl && <img src={avatarUrl} alt="Preview" className="avatar" style={{ width: '100px', height: '100px' }} />}

                <button type="submit">Save Profile</button>
            </form>
        </div>
    );
};

export default Profile;
