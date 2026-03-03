package routes

import (
	"match-me-server/internal/handlers"
	"match-me-server/internal/middleware"
	"match-me-server/internal/realtime"
	"net/http"

	"github.com/gorilla/mux"
)

func SetupRoutes(r *mux.Router, hub *realtime.Hub) {
	// Auth
	r.HandleFunc("/auth/register", handlers.Register).Methods("POST")
	r.HandleFunc("/auth/login", handlers.Login).Methods("POST")

	// Websocket
	r.HandleFunc("/ws", func(w http.ResponseWriter, r *http.Request) {
		realtime.ServeWs(hub, w, r)
	})

	// Users
	api := r.PathPrefix("").Subrouter()
	api.Use(middleware.Auth)

	api.HandleFunc("/me", handlers.GetMe).Methods("GET")
	api.HandleFunc("/me/full", handlers.GetMe).Methods("GET") // Alias for frontend compatibility
	api.HandleFunc("/me", handlers.UpdateMyProfile).Methods("PUT")
	api.HandleFunc("/users/{id}", handlers.GetUser).Methods("GET")
	api.HandleFunc("/users/{id}/profile", handlers.GetUserProfile).Methods("GET")
	api.HandleFunc("/users/{id}/bio", handlers.GetUserBio).Methods("GET")
	api.HandleFunc("/recommendations", handlers.GetRecommendations).Methods("GET")
	api.HandleFunc("/recommendations/dismiss", handlers.DismissRecommendation).Methods("POST")

	// Connections
	api.HandleFunc("/connections", handlers.GetConnections).Methods("GET")
	api.HandleFunc("/connections/requests", handlers.GetRequests).Methods("GET")
	api.HandleFunc("/connections/request", handlers.SendRequest).Methods("POST")
	api.HandleFunc("/connections/respond", handlers.RespondToRequest).Methods("POST")
	api.HandleFunc("/connections/{id}", handlers.Disconnect).Methods("DELETE")

	// Chat
	api.HandleFunc("/chats", handlers.GetChats).Methods("GET")
	api.HandleFunc("/chats/{id}/messages", handlers.GetMessages).Methods("GET")
	api.HandleFunc("/chats/{id}/read", handlers.MarkRead).Methods("PUT")

	// Add more...
}
