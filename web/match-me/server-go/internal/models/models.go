package models

import (
	"encoding/json"
	"time"
)

type User struct {
	ID           int       `json:"id"`
	Email        string    `json:"email"`
	PasswordHash string    `json:"-"`
	CreatedAt    time.Time `json:"created_at"`
}

type Profile struct {
	UserID      int             `json:"user_id"`
	FirstName   string          `json:"first_name"`
	LastName    string          `json:"last_name"`
	Bio         string          `json:"bio"`
	Gender      string          `json:"gender"`
	Location    string          `json:"location"`
	Birthdate   *time.Time      `json:"birthdate"` // Nullable date
	LookingFor  string          `json:"looking_for"`
	Interests   json.RawMessage `json:"interests"`
	Preferences json.RawMessage `json:"preferences"`
	AvatarURL   string          `json:"avatar_url"`
	UpdatedAt   time.Time       `json:"updated_at"`
}

type Connection struct {
	RequesterID int       `json:"requester_id"`
	RecipientID int       `json:"recipient_id"`
	Status      string    `json:"status"`
	CreatedAt   time.Time `json:"created_at"`
}

type Message struct {
	ID         int        `json:"id"`
	SenderID   int        `json:"sender_id"`
	ReceiverID int        `json:"receiver_id"`
	Content    string     `json:"content"`
	ReadAt     *time.Time `json:"read_at"`
	CreatedAt  time.Time  `json:"created_at"`
}
