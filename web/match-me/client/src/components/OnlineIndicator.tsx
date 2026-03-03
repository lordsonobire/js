import React from 'react';
import { useSocket } from '../context/SocketContext';

interface OnlineIndicatorProps {
    userId: number;
    showText?: boolean;
}

const OnlineIndicator: React.FC<OnlineIndicatorProps> = ({ userId, showText = false }) => {
    const { onlineUsers } = useSocket() || { onlineUsers: [] as number[] };
    const isOnline = onlineUsers.includes(userId);

    const style = {
        width: '12px',
        height: '12px',
        borderRadius: '50%',
        backgroundColor: isOnline ? '#4CAF50' : '#e0e0e0', // Green vs Gray
        display: 'inline-block',
        border: '2px solid white',
        boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
    };

    if (!showText) return <span style={style} title={isOnline ? 'Online' : 'Offline'} />;

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={style} />
            <span style={{ fontSize: '0.8em', color: 'var(--text-secondary)' }}>
                {isOnline ? 'Online' : 'Offline'}
            </span>
        </div>
    );
};

export default OnlineIndicator;
